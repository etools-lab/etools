/**
 * Plugin SDK Implementation
 * Provides plugin developers with APIs to extend the application
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  Plugin,
  PluginContext,
  PluginManifest,
  PluginPermission,
  PluginSearchResult,
  PluginSDK,
} from './types';
import { PluginCommands } from './types';

// Re-export UI components for plugin developers
export * from './ui';

/**
 * Create plugin context for a given plugin
 */
function createPluginContext(manifest: PluginManifest): PluginContext {
  const context: PluginContext = {
    manifest,

    // Storage API - always available
    storage: {
      get: async (key: string) => {
        try {
          return await invoke<string | null>('plugin_storage_get', {
            pluginId: manifest.id,
            key,
          });
        } catch (e) {
          console.error('Plugin storage get error:', e);
          return null;
        }
      },
      set: async (key: string, value: string) => {
        await invoke('plugin_storage_set', {
          pluginId: manifest.id,
          key,
          value,
        });
      },
      delete: async (key: string) => {
        await invoke('plugin_storage_delete', {
          pluginId: manifest.id,
          key,
        });
      },
      list: async () => {
        return await invoke<string[]>('plugin_storage_list', {
          pluginId: manifest.id,
        });
      },
    },

    // Settings API
    settings: {
      get: async (key: string) => {
        const setting = manifest.settings?.find(s => s.key === key);
        if (!setting) throw new Error(`Unknown setting: ${key}`);

        const value = await invoke<string | number | boolean>('plugin_get_setting', {
          pluginId: manifest.id,
          key,
        });

        return value ?? setting.default;
      },
      set: async (key: string, value: string | number | boolean) => {
        const setting = manifest.settings?.find(s => s.key === key);
        if (!setting) throw new Error(`Unknown setting: ${key}`);

        await invoke('plugin_set_setting', {
          pluginId: manifest.id,
          key,
          value,
        });
      },
    },
  };

  // Add conditional APIs based on permissions

  // Clipboard API
  if (manifest.permissions.includes('read_clipboard') || manifest.permissions.includes('write_clipboard')) {
    context.clipboard = {
      readText: async () => {
        if (!manifest.permissions.includes('read_clipboard')) {
          throw new Error('Missing read_clipboard permission');
        }
        return await invoke('plugin_clipboard_read');
      },
      writeText: async (text: string) => {
        if (!manifest.permissions.includes('write_clipboard')) {
          throw new Error('Missing write_clipboard permission');
        }
        await invoke('plugin_clipboard_write', { text });
      },
    };
  }

  // File API
  if (manifest.permissions.includes('read_files') || manifest.permissions.includes('write_files')) {
    context.fs = {
      readText: async (path: string) => {
        if (!manifest.permissions.includes('read_files')) {
          throw new Error('Missing read_files permission');
        }
        return await invoke('plugin_fs_read', { path });
      },
      writeText: async (path: string, content: string) => {
        if (!manifest.permissions.includes('write_files')) {
          throw new Error('Missing write_files permission');
        }
        await invoke('plugin_fs_write', { path, content });
      },
    };
  }

  // Network API
  if (manifest.permissions.includes('network')) {
    context.http = {
      get: async (url: string) => {
        return await invoke('plugin_http_get', { url });
      },
      post: async (url: string, body: string) => {
        return await invoke('plugin_http_post', { url, body });
      },
    };
  }

  // Shell API
  if (manifest.permissions.includes('shell')) {
    context.shell = {
      open: async (path: string) => {
        await invoke('plugin_shell_open', { path });
      },
      exec: async (command: string) => {
        return await invoke('plugin_shell_exec', { command });
      },
    };
  }

  // Notification API
  if (manifest.permissions.includes('notifications')) {
    context.notify = async (title: string, message: string) => {
      await invoke('plugin_notify', { title, message });
    };
  }

  return context;
}

/**
 * Global plugin registry
 */
const pluginRegistry = new Map<string, { plugin: Plugin; context: PluginContext }>();

/**
 * Plugin SDK implementation
 */
export const pluginSDK: PluginSDK = {
  /**
   * Register a plugin
   */
  register: async (plugin: Plugin) => {
    const { manifest } = plugin;

    // Validate manifest
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new Error('Invalid plugin manifest: missing required fields');
    }

    // Check if already registered
    if (pluginRegistry.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} is already registered`);
    }

    // Create plugin context
    const context = createPluginContext(manifest);

    // Store plugin
    pluginRegistry.set(manifest.id, { plugin, context });

    // Call onLoad hook
    if (plugin.onLoad) {
      await plugin.onLoad(context);
    }

    console.log(`Plugin registered: ${manifest.id} v${manifest.version}`);
  },

  /**
   * Unregister a plugin
   */
  unregister: async (pluginId: string) => {
    const entry = pluginRegistry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Call onUnload hook
    if (entry.plugin.onUnload) {
      await entry.plugin.onUnload();
    }

    pluginRegistry.delete(pluginId);
    console.log(`Plugin unregistered: ${pluginId}`);
  },

  /**
   * Check if plugin has permission
   */
  hasPermission: async (pluginId: string, permission: PluginPermission) => {
    const entry = pluginRegistry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    return entry.context.manifest.permissions.includes(permission);
  },

  /**
   * Request permission from user
   */
  requestPermission: async (pluginId: string, permission: PluginPermission) => {
    const entry = pluginRegistry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Check if already has permission
    if (entry.context.manifest.permissions.includes(permission)) {
      return true;
    }

    // Request permission via backend
    return await invoke<boolean>('plugin_request_permission', {
      pluginId,
      permission,
    });
  },

  /**
   * Get list of installed plugins
   */
  listPlugins: async () => {
    return await PluginCommands.list();
  },

  /**
   * Enable plugin
   */
  enablePlugin: async (pluginId: string) => {
    await PluginCommands.enable(pluginId);

    const entry = pluginRegistry.get(pluginId);
    if (entry?.plugin.onEnable) {
      await entry.plugin.onEnable();
    }
  },

  /**
   * Disable plugin
   */
  disablePlugin: async (pluginId: string) => {
    await PluginCommands.disable(pluginId);

    const entry = pluginRegistry.get(pluginId);
    if (entry?.plugin.onDisable) {
      await entry.plugin.onDisable();
    }
  },
};

/**
 * Search all plugins for results
 */
export async function searchPlugins(query: string): Promise<PluginSearchResult[]> {
  const results: PluginSearchResult[] = [];

  for (const [pluginId, { plugin, context }] of pluginRegistry) {
    // Check if query matches any trigger
    const matchesTrigger = plugin.manifest.triggers.some(trigger =>
      query.toLowerCase().startsWith(trigger.toLowerCase())
    );

    if (matchesTrigger && plugin.onSearch) {
      try {
        const pluginResults = await plugin.onSearch(query);
        results.push(...pluginResults);
      } catch (e) {
        console.error(`Plugin ${pluginId} search error:`, e);
      }
    }
  }

  return results;
}

/**
 * Get plugin context by ID
 */
export function getPluginContext(pluginId: string): PluginContext | undefined {
  return pluginRegistry.get(pluginId)?.context;
}

/**
 * Check if plugin is registered
 */
export function isPluginRegistered(pluginId: string): boolean {
  return pluginRegistry.has(pluginId);
}

// Export SDK as default
export default pluginSDK;
