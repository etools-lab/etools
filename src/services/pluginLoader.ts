/**
 * Plugin Loader Service
 * Handles plugin discovery, loading, and lifecycle management
 *
 * 职责范围 (Responsibility Scope):
 * - 插件模块加载（动态导入）
 * - 插件清单验证（manifest validation）
 * - 插件注册到沙箱
 * - 插件生命周期管理（onLoad/onUnload/onEnable/onDisable）
 * - 插件搜索执行（调用插件 onSearch 方法）
 * - 权限检查和受限 API 创建
 * - 用户自定义缩写（abbreviations）集成
 *
 * 不包括 (NOT responsible for):
 * - 插件 CRUD 操作（由 pluginManager.ts 负责）
 * - 与 Tauri 后端通信（由 pluginManager.ts 负责）
 * - 插件执行隔离（由 pluginSandbox.ts 负责）
 * - 插件权限授予/撤销（由 pluginManager.ts 负责）
 *
 * 集成 (Integration):
 * - Plugin Sandbox: 沙箱隔离和权限管理
 * - Plugin Abbreviation Service: 用户自定义快捷方式
 */

import type { Plugin, PluginManifest } from '@/types/plugin';
import type { PluginPermission } from '@/lib/plugin-sdk/types';
import type { PluginSearchResultV2, PluginV2 } from '@/lib/plugin-sdk/v2-types';
import { invoke } from '@tauri-apps/api/core';
import { getPluginSandbox } from './pluginSandbox';

/**
 * Forward console messages to Tauri backend for terminal visibility
 */
async function logToBackend(message: string, level: 'info' | 'error' = 'info') {
  try {
    await invoke('write_debug_log', {
      message: `[Frontend ${level.toUpperCase()}] ${message}`
    });
  } catch (error) {
    // Silently fail if backend is not available
  }
}

// ============================================================================
// Constants
// ============================================================================

/** Plugin source indicators in file paths */
const PLUGIN_SOURCE_INDICATORS = {
  applicationSupport: 'Application Support',
  nodeModules: 'node_modules',
} as const;

/**
 * Maps Tauri command names to required plugin permissions
 */
const PERMISSION_MAP: Record<string, PluginPermission> = {
  'get_clipboard_history': 'read:clipboard',
  'paste_clipboard_item': 'write:clipboard',
  'read_file': 'read:files',
  'write_file': 'write:files',
  'http_request': 'network:request',
  'execute_shell': 'shell:execute',
  'send_notification': 'show:notification',
};

/** Valid plugin sources for loading from backend */
const VALID_PLUGIN_SOURCES = ['marketplace', 'local'] as const;

/** Unknown plugin manifest fallback */
const UNKNOWN_MANIFEST: PluginManifest = {
  id: 'unknown',
  name: 'Unknown',
  version: '0.0.0',
  description: 'Failed to load',
  author: 'Unknown',
  permissions: [],
  triggers: [],
};

// ============================================================================
// Types
// ============================================================================

/**
 * Raw plugin module interface (v2)
 * Represents the structure of a plugin module before normalization
 */
interface RawPluginModule {
  manifest?: PluginManifest;
  onSearch?: (query: string) => Promise<PluginSearchResultV2[]>;
  init?(): Promise<void>;
  onDestroy?(): Promise<void>;
}

/**
 * Plugin module with default export
 */
interface ModuleWithDefault {
  default?: RawPluginModule;
  manifest?: PluginManifest;
  onSearch?: RawPluginModule['onSearch'];
  init?: RawPluginModule['init'];
  onDestroy?: RawPluginModule['onDestroy'];
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  manifest: PluginManifest;
  plugin?: Plugin;
  error?: string;
}

/**
 * Plugin info from backend
 */
interface BackendPluginInfo {
  id: string;
  install_path?: string;
  source: string;
  enabled: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if plugin has required permission for a command (T047)
 */
function hasPermission(permissions: PluginPermission[], cmd: string): boolean {
  const required = PERMISSION_MAP[cmd];
  return required ? permissions.includes(required) : true;
}

/**
 * Extract plugin from module, supporting both default and named exports (v2)
 */
function extractPluginFromModule(module: ModuleWithDefault): RawPluginModule {
  // Default export: export default { manifest, onSearch, init, onDestroy }
  if (module.default && typeof module.default === 'object') {
    return module.default;
  }
  // Named exports: export const manifest = {...}; export function onSearch() {...}
  return {
    manifest: module.manifest,
    onSearch: module.onSearch,
    init: module.init,
    onDestroy: module.onDestroy,
  };
}

/**
 * Normalize module path for Vite dynamic import
 * Plugin modules are loaded from file system via blob URLs
 */
function normalizeModulePath(modulePath: string): string {
  // Plugin path is returned as-is (will be converted to blob URL if needed)
  return modulePath;
}

/**
 * Check if path is for an npm/local plugin (requires blob loading)
 */
function isNpmPluginPath(path: string): boolean {
  return path.includes(PLUGIN_SOURCE_INDICATORS.applicationSupport) ||
         path.includes(PLUGIN_SOURCE_INDICATORS.nodeModules);
}

/**
 * Create a blob URL from file content for dynamic import
 * Wraps the plugin code to provide JSX runtime functions
 */
async function createBlobUrlFromPath(filePath: string): Promise<string> {
  let pluginCode = await invoke<string>('read_file', { path: filePath });

  // Replace the jsx-runtime import with an import from Vite's pre-bundled deps
  // This works around the limitation that import maps don't work with blob URLs
  // Use full URL with origin so blob URL context can resolve it
  const viteOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:1420';

  // Vite pre-bundles react and react/jsx-runtime as CommonJS, so we need to use default import
  // Replace: import { Fragment, jsx, jsxs } from "react/jsx-runtime"
  // With: import jsxRuntime from "..."; const { Fragment, jsx, jsxs } = jsxRuntime;
  pluginCode = pluginCode.replace(
    /import\s*\{([^}]+)\}\s*from\s+["']react\/jsx-runtime["']/g,
    (match, bindings) => {
      const bindingList = bindings.split(',').map(b => b.trim());
      const bindingsStr = bindingList.join(', ');
      return `import jsxRuntime from '${viteOrigin}/node_modules/.vite/deps/react_jsx-runtime.js'; const { ${bindingsStr} } = jsxRuntime;`;
    }
  );

  // Replace: import { useState, useEffect } from "react"
  // With: import react from "..."; const { useState, useEffect } = react;
  pluginCode = pluginCode.replace(
    /import\s*\{([^}]+)\}\s*from\s+["']react["']/g,
    (match, bindings) => {
      const bindingList = bindings.split(',').map(b => b.trim());
      const bindingsStr = bindingList.join(', ');
      return `import react from '${viteOrigin}/node_modules/.vite/deps/react.js'; const { ${bindingsStr} } = react;`;
    }
  );

  // Replace: import { PluginUIContainer, Button, Input, Card, Badge } from "@etools/plugin-sdk"
  // With: import * as etoolsSDK from "..."; const { PluginUIContainer, Button, Input, Card, Badge } = etoolsSDK;
  pluginCode = pluginCode.replace(
    /import\s*\{([^}]+)\}\s*from\s+["']@etools\/plugin-sdk["']/g,
    (match, bindings) => {
      const bindingList = bindings.split(',').map(b => b.trim());
      const bindingsStr = bindingList.join(', ');
      return `import * as etoolsSDK from '${viteOrigin}/node_modules/.vite/deps/@etools_plugin-sdk.js'; const { ${bindingsStr} } = etoolsSDK;`;
    }
  );

  const blob = new Blob([pluginCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

/**
 * Create error load result
 */
function createErrorResult(
  pluginId: string,
  errorMessage: string
): PluginLoadResult {
  return {
    manifest: {
      id: pluginId,
      name: pluginId,
      version: '0.0.0',
      description: 'Failed to load',
      author: 'Unknown',
      permissions: [],
      triggers: [],
    },
    error: errorMessage,
  };
}

/**
 * Validate plugin manifest
 */
function validateManifest(manifest: PluginManifest | undefined): manifest is PluginManifest {
  if (!manifest) {
    throw new Error('Plugin manifest is missing');
  }

  const requiredFields = ['id', 'name', 'version'] as const;
  for (const field of requiredFields) {
    if (!manifest[field]) {
      throw new Error(`Plugin manifest missing required field: ${field}`);
    }
  }

  return true;
}

/**
 * Check if plugin source is valid for loading
 */
function isValidPluginSource(source: string): boolean {
  return VALID_PLUGIN_SOURCES.includes(source as typeof VALID_PLUGIN_SOURCES[number]);
}

/**
 * Get log prefix for plugin
 */
function logPrefix(pluginId: string): string {
  return `[PluginLoader:${pluginId}]`;
}

// ============================================================================
// Restricted API
// ============================================================================

/**
 * Restricted API wrapper for plugins (T048)
 * Wraps Tauri invoke calls with permission checking
 */
export function createRestrictedAPI(
  pluginId: string,
  permissions: PluginPermission[]
) {
  const apiInvoke = async (cmd: string, args?: Record<string, unknown>) => {
    if (!hasPermission(permissions, cmd)) {
      throw new Error(`Plugin ${pluginId} lacks required permission for ${cmd}`);
    }

    console.log(`[PluginAPI] ${pluginId} invoking ${cmd}`, args);
    return invoke(cmd, args);
  };

  return {
    invoke: apiInvoke,
    clipboard: {
      getHistory: (limit?: number) => apiInvoke('get_clipboard_history', { limit }),
      paste: (id: string) => apiInvoke('paste_clipboard_item', { id }),
    },
    file: {
      read: (path: string) => apiInvoke('read_file', { path }),
      write: (path: string, content: string) => apiInvoke('write_file', { path, content }),
    },
    shell: {
      execute: (command: string) => apiInvoke('execute_shell', { command }),
    },
    network: {
      request: async (url: string, options?: RequestInit) => {
        if (!permissions.includes('network:request')) {
          throw new Error(`Plugin ${pluginId} lacks network permission`);
        }
        return fetch(url, options);
      },
    },
    notification: {
      send: (title: string, body: string) => apiInvoke('send_notification', { title, body }),
    },
  };
}

// ============================================================================
// Plugin Loader Class
// ============================================================================

/**
 * Plugin Loader class
 * Manages plugin discovery, loading, and lifecycle
 */
export class PluginLoader {
  private loadedPlugins = new Map<string, Plugin>();
  private pluginManifests = new Map<string, PluginManifest>();

  /**
   * Load a plugin from a module
   * Supports plugins installed from file system
   */
  async loadPlugin(modulePath: string): Promise<PluginLoadResult> {
    try {
      console.log(`${logPrefix('Loader')} Loading from: ${modulePath}`);

      let normalizedPath = normalizeModulePath(modulePath);

      // For npm plugins, read file and create blob URL
      if (isNpmPluginPath(modulePath)) {
        console.log(`${logPrefix('Loader')} Detected npm plugin`);
        normalizedPath = await createBlobUrlFromPath(modulePath);
        console.log(`${logPrefix('Loader')} Created module URL`);
      }

      // Dynamic import of plugin module
      console.log(`${logPrefix('Loader')} Importing: ${normalizedPath}`);
      const module = await import(/* @vite-ignore */ normalizedPath);
      const rawPlugin = extractPluginFromModule(module);

      const plugin: Plugin = {
        ...rawPlugin,
        onSearch: rawPlugin.onSearch || (() => Promise.resolve([])),
        init: rawPlugin.init,
        onDestroy: rawPlugin.onDestroy,
      };

      validateManifest(plugin.manifest);
      const { manifest } = plugin;

      this.loadedPlugins.set(manifest.id, plugin);
      this.pluginManifests.set(manifest.id, manifest);

      // Register plugin with sandbox for permission management
      getPluginSandbox().registerPlugin(manifest.id, manifest.permissions);

      const successMessage = `${logPrefix('Loader')} Loaded: ${manifest.id} v${manifest.version}`;
      console.log(successMessage);
      await logToBackend(successMessage, 'info');

      return { manifest, plugin };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorPrefix = `${logPrefix('Loader')} Failed to load from ${modulePath}`;
      console.error(errorPrefix, errorMessage);
      await logToBackend(`${errorPrefix}: ${errorMessage}`, 'error');

      return {
        manifest: UNKNOWN_MANIFEST,
        error: errorMessage,
      };
    }
  }

  /**
   * Load all installed npm plugins
   */
  async loadInstalledNpmPlugins(): Promise<PluginLoadResult[]> {
    try {
      const installedPlugins = await invoke<BackendPluginInfo[]>('get_installed_plugins');
      console.log(`${logPrefix('Loader')} Found ${installedPlugins.length} plugins from backend`);

      const results: PluginLoadResult[] = [];

      for (const pluginInfo of installedPlugins) {
        if (!isValidPluginSource(pluginInfo.source)) {
          console.log(`${logPrefix('Loader')} Skipping (invalid source): ${pluginInfo.id}`);
          continue;
        }

        const result = await this.loadSingleNpmPlugin(pluginInfo);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error(`${logPrefix('Loader')} Failed to load installed plugins:`, error);
      return [];
    }
  }

  /**
   * Load a single npm plugin from backend info
   */
  private async loadSingleNpmPlugin(
    pluginInfo: BackendPluginInfo
  ): Promise<PluginLoadResult> {
    const { id: packageName, install_path: installPath = '', enabled } = pluginInfo;

    if (!packageName) {
      return createErrorResult('unknown', 'Plugin ID is missing');
    }

    console.log(`${logPrefix('Loader')} Loading npm plugin: ${packageName} from ${installPath}`);
    console.log(`${logPrefix('Loader')} Plugin enabled: ${enabled}`);

    try {
      const result = await this.loadPlugin(installPath);

      // Set plugin enabled state based on backend info
      if (result.plugin && !enabled) {
        console.log(`${logPrefix('Loader')} Disabling: ${result.manifest.id}`);
        getPluginSandbox().setPluginEnabled(result.manifest.id, false);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${logPrefix('Loader')} Failed to load ${packageName}:`, error);
      return createErrorResult(packageName, errorMessage);
    }
  }

  /**
   * Load all installed plugins (alias for loadInstalledNpmPlugins)
   */
  async loadInstalledPlugins(): Promise<PluginLoadResult[]> {
    return this.loadInstalledNpmPlugins();
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not loaded`);
    }

    // Unregister from sandbox (T094)
    getPluginSandbox().unregisterPlugin(pluginId);

    // Remove from storage
    this.loadedPlugins.delete(pluginId);
    this.pluginManifests.delete(pluginId);

    console.log(`${logPrefix('Loader')} Unloaded: ${pluginId}`);
  }

  /**
   * Get loaded plugin
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  /**
   * Get plugin manifest
   */
  getManifest(pluginId: string): PluginManifest | undefined {
    return this.pluginManifests.get(pluginId);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Get all manifests
   */
  getAllManifests(): PluginManifest[] {
    return Array.from(this.pluginManifests.values());
  }

  /**
   * Check if plugin is loaded
   */
  isLoaded(pluginId: string): boolean {
    return this.loadedPlugins.has(pluginId);
  }

  /**
   * Search plugins by trigger (v2)
   * Simplified version - directly calls plugin onSearch functions
   * Returns PluginSearchResultV2[] with actionData
   */
  async searchByTrigger(query: string): Promise<PluginSearchResultV2[]> {
    const results: PluginSearchResultV2[] = [];
    const lowerQuery = query.toLowerCase();

    console.log(`${logPrefix('Loader')} searchByTrigger: ${query}`);

    // Load abbreviation service
    const { pluginAbbreviationService } = await import('./pluginAbbreviationService');
    await pluginAbbreviationService.loadConfig();

    for (const [pluginId, plugin] of this.loadedPlugins.entries()) {
      // Check trigger match
      const matchesTrigger = plugin.manifest.triggers.some((trigger: string) =>
        lowerQuery.startsWith(trigger.toLowerCase())
      );

      // Check abbreviation match
      const abbreviations = pluginAbbreviationService.getAbbreviations(pluginId);
      const matchesAbbreviation = abbreviations.some((abbr) => {
        if (!abbr.enabled) return false;
        const abbrLower = abbr.keyword.toLowerCase();
        return lowerQuery === abbrLower || lowerQuery.startsWith(`${abbrLower}:`);
      });

      if (!matchesTrigger && !matchesAbbreviation) {
        continue;
      }

      console.log(`${logPrefix('Loader')} Query "${query}" matched ${pluginId}`);

      // Check if plugin is enabled
      const sandbox = getPluginSandbox();
      const context = sandbox.getPluginContext(pluginId);
      if (!context || !context.isEnabled) {
        console.log(`${logPrefix('Loader')} Plugin ${pluginId} is disabled, skipping`);
        continue;
      }

      // Execute search
      const searchResults = await this.executePluginSearch(pluginId, plugin, query);
      if (Array.isArray(searchResults)) {
        results.push(...searchResults);
      }
    }

    console.log(`${logPrefix('Loader')} Total results: ${results.length}`);
    return results;
  }

  /**
   * Execute plugin search with error handling (v2)
   */
  private async executePluginSearch(
    pluginId: string,
    plugin: Plugin,
    query: string
  ): Promise<PluginSearchResultV2[] | undefined> {
    const searchFunction = plugin.onSearch;

    if (typeof searchFunction !== 'function') {
      console.error(`${logPrefix('Loader')} Plugin ${pluginId} missing onSearch function`);
      return undefined;
    }

    try {
      const results = await searchFunction(query);
      console.log(`${logPrefix('Loader')} Plugin ${pluginId} returned:`, results);
      return results;
    } catch (error) {
      console.error(`${logPrefix('Loader')} Plugin ${pluginId} search error:`, error);
      return undefined;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/** Singleton plugin loader instance */
export const pluginLoader = new PluginLoader();

