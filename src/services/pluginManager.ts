/**
 * Plugin Manager Service
 * Frontend service wrapping Tauri commands for plugin management
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  Plugin,
  PluginManifest,
  MarketplacePlugin,
  PluginFilters,
  MarketplaceQueryOptions,
  BulkOperation,
  PluginHealth,
  PluginUsageStats,
  PluginCategory,
  PluginPermission,
} from '../types/plugin';

// ============================================================================
// Backend Raw Types (snake_case from Rust)
// ============================================================================

/**
 * Raw plugin structure from backend (snake_case)
 * This matches the Rust Plugin struct
 */
interface RawPluginFromBackend {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string | null;
  enabled: boolean;
  permissions: string[];
  entry_point: string;
  triggers: RawPluginTrigger[];
  settings: Record<string, unknown>;
  health: RawPluginHealth;
  usage_stats: RawPluginUsageStats;
  installed_at: number;
}

interface RawPluginTrigger {
  keyword: string;
  description: string;
  hotkey: string | null;
}

interface RawPluginHealth {
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string | null;
  last_checked: number;
  errors: RawPluginErrorEntry[];
}

interface RawPluginErrorEntry {
  code: string;
  message: string;
  timestamp: number;
  context: Record<string, string> | null;
}

interface RawPluginUsageStats {
  last_used: number | null;
  usage_count: number;
  last_execution_time: number | null;
  average_execution_time: number | null;
}

// ============================================================================
// Type Conversion Utilities
// ============================================================================

/**
 * Convert backend snake_case to frontend camelCase Plugin
 */
function convertRawPluginToFrontend(raw: RawPluginFromBackend): Plugin {
  // Convert health
  const health: PluginHealth = {
    status: raw.health.status,
    message: raw.health.message ?? undefined,
    lastChecked: raw.health.last_checked,
    errors: raw.health.errors.map(e => ({
      code: e.code,
      message: e.message,
      timestamp: e.timestamp,
      context: e.context ?? undefined as Record<string, unknown> | undefined,
    })),
  };

  // Convert usage stats
  const usageStats: PluginUsageStats = {
    lastUsed: raw.usage_stats.last_used,
    usageCount: raw.usage_stats.usage_count,
    lastExecutionTime: raw.usage_stats.last_execution_time ?? undefined,
    averageExecutionTime: raw.usage_stats.average_execution_time ?? undefined,
  };

  // Convert triggers
  const triggers = raw.triggers.map(t => t.keyword);

  // Convert permissions
  const permissions = raw.permissions as PluginPermission[];

  // Build manifest
  const manifest: PluginManifest = {
    id: raw.id,
    name: raw.name,
    version: raw.version,
    description: raw.description,
    author: raw.author ?? '',
    permissions,
    triggers,
  };

  return {
    manifest,
    enabled: raw.enabled,
    health,
    usageStats,
    installedAt: raw.installed_at,
  };
}

/**
 * Plugin Manager Service
 * Provides methods to interact with backend plugin management
 */
export class PluginManagerService {
  /**
   * Get all installed plugins from marketplace
   * 直接调用后端，后端读取 package.json（< 1ms）
   */
  async getInstalledPlugins(): Promise<Plugin[]> {
    try {
      // 直接调用后端，后端会读取 plugins/package.json
      const rawPlugins = await invoke<RawPluginFromBackend[]>('get_installed_plugins');

      console.log('[PluginManager] Retrieved', rawPlugins.length, 'plugins from package.json');

      // 转换后端数据到前端格式
      return rawPlugins.map(convertRawPluginToFrontend);
    } catch (error) {
      console.error('[PluginManager] Failed to get installed plugins:', error);
      throw new Error(
        `Failed to load plugins: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    try {
      await invoke('plugin_enable', { pluginId });

      // Update sandbox state
      const { getPluginSandbox } = await import('./pluginSandbox');
      getPluginSandbox().setPluginEnabled(pluginId, true);
    } catch (error) {
      console.error('Failed to enable plugin:', error);
      throw new Error(
        `Failed to enable plugin: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    try {
      await invoke('plugin_disable', { pluginId });

      // Update sandbox state
      const { getPluginSandbox } = await import('./pluginSandbox');
      getPluginSandbox().setPluginEnabled(pluginId, false);
    } catch (error) {
      console.error('Failed to disable plugin:', error);
      throw new Error(
        `Failed to disable plugin: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Bulk enable plugins
   */
  async bulkEnablePlugins(pluginIds: string[]): Promise<BulkOperation> {
    try {
      const result = await invoke<BulkOperation>('bulk_enable_plugins', {
        pluginIds,
      });
      return result;
    } catch (error) {
      console.error('Failed to bulk enable plugins:', error);
      throw new Error(
        `Failed to enable plugins: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Bulk disable plugins
   */
  async bulkDisablePlugins(pluginIds: string[]): Promise<BulkOperation> {
    try {
      const result = await invoke<BulkOperation>('bulk_disable_plugins', {
        pluginIds,
      });
      return result;
    } catch (error) {
      console.error('Failed to bulk disable plugins:', error);
      throw new Error(
        `Failed to disable plugins: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    try {
      await invoke('plugin_uninstall', { pluginId });
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      throw new Error(
        `Failed to uninstall plugin: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Bulk uninstall plugins
   */
  async bulkUninstallPlugins(pluginIds: string[]): Promise<BulkOperation> {
    try {
      const result = await invoke<BulkOperation>('bulk_uninstall_plugins', {
        pluginIds,
      });
      return result;
    } catch (error) {
      console.error('Failed to bulk uninstall plugins:', error);
      throw new Error(
        `Failed to uninstall plugins: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get plugin health status
   */
  async getPluginHealth(pluginId: string): Promise<PluginHealth> {
    try {
      const health = await invoke<PluginHealth>('plugin_get_health', {
        pluginId,
      });
      return health;
    } catch (error) {
      console.error('Failed to get plugin health:', error);
      throw new Error(
        `Failed to get health: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check plugin health (trigger health check)
   */
  async refreshPluginHealth(pluginId: string): Promise<PluginHealth> {
    try {
      const health = await invoke<PluginHealth>('plugin_check_health', {
        pluginId,
      });
      return health;
    } catch (error) {
      console.error('Failed to check plugin health:', error);
      throw new Error(
        `Failed to check health: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get plugin usage statistics
   */
  async getPluginUsageStats(pluginId: string): Promise<PluginUsageStats> {
    try {
      const stats = await invoke<PluginUsageStats>('plugin_get_usage_stats', {
        pluginId,
      });
      return stats;
    } catch (error) {
      console.error('Failed to get plugin usage stats:', error);
      throw new Error(
        `Failed to get usage stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(
    pluginId: string,
    config: Record<string, string | number | boolean>
  ): Promise<void> {
    try {
      await invoke('plugin_update_config', { pluginId, config });
    } catch (error) {
      console.error('Failed to update plugin config:', error);
      throw new Error(
        `Failed to update config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Grant plugin permissions
   */
  async grantPermissions(
    pluginId: string,
    permissions: string[]
  ): Promise<void> {
    try {
      await invoke('plugin_grant_permissions', { pluginId, permissions });
    } catch (error) {
      console.error('Failed to grant permissions:', error);
      throw new Error(
        `Failed to grant permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Revoke plugin permissions
   */
  async revokePermissions(
    pluginId: string,
    permissions: string[]
  ): Promise<void> {
    try {
      await invoke('plugin_revoke_permissions', { pluginId, permissions });
    } catch (error) {
      console.error('Failed to revoke permissions:', error);
      throw new Error(
        `Failed to revoke permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Marketplace Service
 * Provides methods to interact with plugin marketplace
 */
export class MarketplaceService {
  /**
   * Get marketplace plugins
   */
  async getMarketplacePlugins(
    options: MarketplaceQueryOptions = {}
  ): Promise<{ plugins: MarketplacePlugin[]; total: number; hasMore: boolean }> {
    try {
      const result = await invoke<{
        plugins: MarketplacePlugin[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>('marketplace_list', {
        category: options.category,
        page: options.page || 1,
        pageSize: options.pageSize || 20,
      });
      return {
        plugins: result.plugins,
        total: result.total,
        hasMore: result.hasMore,
      };
    } catch (error) {
      console.error('Failed to get marketplace plugins:', error);
      throw new Error(
        `Failed to load marketplace: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search marketplace plugins
   */
  async searchMarketplace(
    query: string,
    options: MarketplaceQueryOptions = {}
  ): Promise<{ plugins: MarketplacePlugin[]; total: number; hasMore: boolean }> {
    try {
      const result = await invoke<{
        plugins: MarketplacePlugin[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>('marketplace_search', {
        query,
        category: options.category,
        page: options.page || 1,
        pageSize: options.pageSize || 20,
      });
      return {
        plugins: result.plugins,
        total: result.total,
        hasMore: result.hasMore,
      };
    } catch (error) {
      console.error('Failed to search marketplace:', error);
      throw new Error(
        `Failed to search marketplace: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Install plugin from marketplace
   */
  async installPlugin(
    pluginId: string,
    onProgress?: (progress: number) => void
  ): Promise<Plugin> {
    try {
      // TODO: Add progress callback support
      const plugin = await invoke<Plugin>('marketplace_install', { pluginId });
      return plugin;
    } catch (error) {
      console.error('Failed to install plugin:', error);
      throw new Error(
        `Failed to install plugin: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check for plugin updates
   */
  async checkUpdates(): Promise<string[]> {
    try {
      const updates = await invoke<string[]>('marketplace_check_updates');
      return updates;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      throw new Error(
        `Failed to check updates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get plugin categories
   */
  getCategories(): PluginCategory[] {
    return [
      'productivity',
      'developer',
      'utilities',
      'search',
      'media',
      'integration',
    ];
  }
}

// Export singleton instances
export const pluginManagerService = new PluginManagerService();
export const marketplaceService = new MarketplaceService();

// Export default for backwards compatibility
export default pluginManagerService;
