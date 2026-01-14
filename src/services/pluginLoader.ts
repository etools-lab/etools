/**
 * Plugin Loader Service (T111)
 * Handles plugin discovery, loading, and lifecycle management
 *
 * Integrated with Plugin Sandbox (T094-T098) for isolated execution
 * v2 API Only: All plugins execute in Worker with actionData architecture
 */

import type { Plugin, PluginManifest } from '@/types/plugin';
import type { PluginPermission } from '@/lib/plugin-sdk/types';
import type { PluginSearchResult } from '@/lib/plugin-sdk/types';
import { invoke } from '@tauri-apps/api/core';
import { getPluginSandbox } from './pluginSandbox';

// ============================================================================
// Constants
// ============================================================================

/** Plugin file extension */
const PLUGIN_FILE_EXTENSION = '/index.ts';

/** Maximum clipboard preview length */
const CLIPBOARD_PREVIEW_MAX_LENGTH = 50;

/** Plugin source indicators in file paths */
const PLUGIN_SOURCE_INDICATORS = {
  applicationSupport: 'Application Support',
  nodeModules: 'node_modules',
} as const;

/**
 * Permission mapping for Tauri commands (T006, T047)
 * Maps Tauri command names to required plugin permissions
 */
const PERMISSION_MAP: Record<string, PluginPermission> = {
  'get_clipboard_history': 'read_clipboard',
  'paste_clipboard_item': 'write_clipboard',
  'read_file': 'read_files',
  'write_file': 'write_files',
  'http_request': 'network',
  'execute_shell': 'shell',
  'send_notification': 'notifications',
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
 * Raw plugin module interface
 * Represents the structure of a plugin module before normalization
 */
interface RawPluginModule {
  manifest?: PluginManifest;
  search?: (query: string) => PluginSearchResult[] | Promise<PluginSearchResult[]>;
  onSearch?: (query: string) => PluginSearchResult[] | Promise<PluginSearchResult[]>;
  executeAction?: (actionData: unknown) => unknown;
}

/**
 * Plugin module with default export
 */
interface ModuleWithDefault {
  default?: RawPluginModule;
  manifest?: PluginManifest;
  search?: RawPluginModule['search'];
  onSearch?: RawPluginModule['onSearch'];
  executeAction?: RawPluginModule['executeAction'];
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
 * Extract plugin from module, supporting both default and named exports
 */
function extractPluginFromModule(module: ModuleWithDefault): RawPluginModule {
  // Default export: export default { manifest, onSearch, executeAction }
  if (module.default && typeof module.default === 'object') {
    return module.default;
  }
  // Named exports: export const manifest = {...}; export function onSearch() {...}
  return {
    manifest: module.manifest,
    search: module.onSearch ?? module.search,
    executeAction: module.executeAction,
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
 */
async function createBlobUrlFromPath(filePath: string): Promise<string> {
  const fileContent = await invoke<string>('read_file', { path: filePath });
  const blob = new Blob([fileContent], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

/**
 * Truncate text to maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

/**
 * Create error manifest for failed plugin load
 */
function createErrorManifest(
  pluginId: string,
  error: string
): PluginManifest {
  return {
    id: pluginId,
    name: pluginId,
    version: '0.0.0',
    description: 'Failed to load',
    author: 'Unknown',
    permissions: [],
    triggers: [],
  };
}

/**
 * Create error load result
 */
function createErrorResult(
  pluginId: string,
  errorMessage: string
): PluginLoadResult {
  return {
    manifest: createErrorManifest(pluginId, errorMessage),
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
// Action Wrapping
// ============================================================================

/**
 * Create a wrapped action function that handles execution and clipboard output
 */
function createWrappedAction(
  rawPlugin: RawPluginModule,
  pluginId: string,
  result: { id: string; actionData: unknown }
): () => Promise<void> {
  return async () => {
    console.log(`${logPrefix(pluginId)} Executing action for ${result.id}`);

    if (typeof rawPlugin.executeAction !== 'function') {
      console.warn(`${logPrefix(pluginId)} Missing executeAction function`);
      return;
    }

    try {
      const output = await rawPlugin.executeAction(result.actionData);

      // Copy string output to clipboard
      if (typeof output === 'string') {
        await invoke('write_clipboard_text', { text: output });
        const preview = truncateText(output, CLIPBOARD_PREVIEW_MAX_LENGTH);
        console.log(`${logPrefix(pluginId)} Copied to clipboard: ${preview}`);
      } else {
        console.log(`${logPrefix(pluginId)} Action executed (no clipboard output)`);
      }
    } catch (error) {
      console.error(`${logPrefix(pluginId)} Action execution failed:`, error);
      throw error;
    }
  };
}

/**
 * Wrap plugin search function to auto-convert actionData to executable actions
 */
function wrapPluginActions(
  plugin: Plugin,
  rawPlugin: RawPluginModule,
  pluginId: string
): Plugin {
  const originalSearch = rawPlugin.search ?? rawPlugin.onSearch;

  return {
    ...plugin,
    search: async (query: string) => {
      console.log(`${logPrefix(pluginId)} Calling search with query: ${query}`);

      const results = await originalSearch(query);
      const resultCount = Array.isArray(results) ? results.length : 0;
      console.log(`${logPrefix(pluginId)} Returned ${resultCount} results`);

      // Convert actionData to action functions if present
      if (Array.isArray(results) && resultCount > 0 && 'actionData' in results[0]) {
        console.log(`${logPrefix(pluginId)} Converting actionData to action`);
        return results.map((result) => ({
          ...result,
          action: createWrappedAction(rawPlugin, pluginId, result),
        }));
      }

      return results;
    },
  };
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
        if (!permissions.includes('network')) {
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

      // Normalize plugin: ensure search property exists
      const plugin: Plugin = {
        ...rawPlugin,
        search: rawPlugin.search ?? rawPlugin.onSearch,
      };

      validateManifest(plugin.manifest);
      const { manifest } = plugin;

      // Wrap search function to auto-convert actionData to action
      const wrappedPlugin = wrapPluginActions(plugin, rawPlugin, manifest.id);

      this.loadedPlugins.set(manifest.id, wrappedPlugin);
      this.pluginManifests.set(manifest.id, manifest);

      // Register plugin with sandbox for permission management
      getPluginSandbox().registerPlugin(manifest.id, manifest.permissions);

      console.log(`${logPrefix('Loader')} Loaded: ${manifest.id} v${manifest.version}`);

      return { manifest, plugin: wrappedPlugin };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${logPrefix('Loader')} Failed to load from ${modulePath}:`, errorMessage);

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
   * Search plugins by trigger
   * Simplified version - directly calls plugin search functions
   */
  async searchByTrigger(query: string): Promise<PluginSearchResult[]> {
    const results: PluginSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    console.log(`${logPrefix('Loader')} searchByTrigger: ${query}`);

    // Load abbreviation service
    const { pluginAbbreviationService } = await import('./pluginAbbreviationService');
    await pluginAbbreviationService.loadConfig();

    for (const [pluginId, plugin] of this.loadedPlugins.entries()) {
      // Check trigger match
      const matchesTrigger = plugin.manifest.triggers.some((trigger) =>
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
   * Execute plugin search with error handling
   */
  private async executePluginSearch(
    pluginId: string,
    plugin: Plugin,
    query: string
  ): Promise<PluginSearchResult[] | undefined> {
    const searchFunction = plugin.search;

    if (typeof searchFunction !== 'function') {
      console.error(`${logPrefix('Loader')} Plugin ${pluginId} missing search function`);
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

/**
 * Plugin search result interface (re-exported for convenience)
 */
export interface PluginSearchResult {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  action?: () => void | Promise<void>;
}
