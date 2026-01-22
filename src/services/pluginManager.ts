/**
 * Plugin Manager Service
 * Frontend service wrapping Tauri commands for plugin management
 *
 * 职责范围 (Responsibility Scope):
 * - 插件 CRUD 操作（启用/禁用/卸载）
 * - 与 Tauri 后端通信
 * - 权限管理（授予/撤销）
 * - 插件健康状态查询
 * - 插件使用统计
 * - 插件市场交互（安装/更新）
 *
 * 不包括 (NOT responsible for):
 * - 插件模块加载（由 pluginLoader.ts 负责）
 * - 插件执行逻辑（由 pluginSandbox.ts 和 workers 负责）
 * - 插件搜索（由 searchService.ts 负责）
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  Plugin,
  PluginManifest,
  MarketplacePlugin,
  MarketplaceQueryOptions,
  BulkOperation,
  PluginHealth,
  PluginUsageStats,
  PluginCategory,
  PluginPermission,
  PluginUpdateInfo,
} from '../types/plugin';

// ============================================================================
// Tauri Invoke Helper - 统一的错误处理
// ============================================================================

/**
 * 简化的 Tauri invoke 调用，自动处理错误
 */
async function invokeCmd<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    throw new Error(`${cmd} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 无返回值的 Tauri invoke 调用
 */
async function invokeVoid(cmd: string, args?: Record<string, unknown>): Promise<void> {
  try {
    await invoke(cmd, args);
  } catch (error) {
    throw new Error(`${cmd} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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

  // Convert usage stats (use null instead of undefined for nullable fields)
  const usageStats: PluginUsageStats = {
    lastUsed: raw.usage_stats.last_used ?? null,
    usageCount: raw.usage_stats.usage_count,
    lastExecutionTime: raw.usage_stats.last_execution_time ?? undefined,
    averageExecutionTime: raw.usage_stats.average_execution_time ?? undefined,
  };

  // Convert permissions (backend returns string[], assume they are valid PluginPermission values)
  const permissions: PluginPermission[] = raw.permissions as PluginPermission[];

  // Convert triggers (for onSearch support)
  const triggers = raw.triggers.map(t => t.keyword);

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
    packageName: `@etools-plugin/${raw.id}`,
    onSearch: undefined as any,
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
    const rawPlugins = await invokeCmd<RawPluginFromBackend[]>('get_installed_plugins');
    console.log('[PluginManager] Retrieved', rawPlugins.length, 'plugins from package.json');
    return rawPlugins.map(convertRawPluginToFrontend);
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    await invokeVoid('enable_plugin', { pluginId });
    const { getPluginSandbox } = await import('./pluginSandbox');
    getPluginSandbox().setPluginEnabled(pluginId, true);
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    await invokeVoid('disable_plugin', { pluginId });
    const { getPluginSandbox } = await import('./pluginSandbox');
    getPluginSandbox().setPluginEnabled(pluginId, false);
  }

  /**
   * Bulk enable plugins
   */
  async bulkEnablePlugins(pluginIds: string[]): Promise<BulkOperation> {
    return invokeCmd<BulkOperation>('bulk_enable_plugins', { pluginIds });
  }

  /**
   * Bulk disable plugins
   */
  async bulkDisablePlugins(pluginIds: string[]): Promise<BulkOperation> {
    return invokeCmd<BulkOperation>('bulk_disable_plugins', { pluginIds });
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    await invokeVoid('plugin_uninstall', { pluginId });
  }

  /**
   * Bulk uninstall plugins
   */
  async bulkUninstallPlugins(pluginIds: string[]): Promise<BulkOperation> {
    return invokeCmd<BulkOperation>('bulk_uninstall_plugins', { pluginIds });
  }

  /**
   * Get plugin health status
   */
  async getPluginHealth(pluginId: string): Promise<PluginHealth> {
    return invokeCmd<PluginHealth>('plugin_get_health', { pluginId });
  }

  /**
   * Check plugin health (trigger health check)
   */
  async refreshPluginHealth(pluginId: string): Promise<PluginHealth> {
    return invokeCmd<PluginHealth>('plugin_check_health', { pluginId });
  }

  /**
   * Get plugin usage statistics
   */
  async getPluginUsageStats(pluginId: string): Promise<PluginUsageStats> {
    return invokeCmd<PluginUsageStats>('plugin_get_usage_stats', { pluginId });
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(
    pluginId: string,
    config: Record<string, string | number | boolean>
  ): Promise<void> {
    await invokeVoid('plugin_update_config', { pluginId, config });
  }

  /**
   * Grant plugin permissions
   */
  async grantPermissions(
    pluginId: string,
    permissions: string[]
  ): Promise<void> {
    await invokeVoid('plugin_grant_permissions', { pluginId, permissions });
  }

  /**
   * Revoke plugin permissions
   */
  async revokePermissions(
    pluginId: string,
    permissions: string[]
  ): Promise<void> {
    await invokeVoid('plugin_revoke_permissions', { pluginId, permissions });
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
    const result = await invokeCmd<{
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
    return { plugins: result.plugins, total: result.total, hasMore: result.hasMore };
  }

  /**
   * Search marketplace plugins
   */
  async searchMarketplace(
    query: string,
    options: MarketplaceQueryOptions = {}
  ): Promise<{ plugins: MarketplacePlugin[]; total: number; hasMore: boolean }> {
    const result = await invokeCmd<{
      plugins: MarketplacePlugin[];
      total: number;
      page: number;
      pageSize: number;
      hasMore: boolean;
    }>('marketplace_search', { query, ...options, page: options.page || 1, pageSize: options.pageSize || 20 });
    return { plugins: result.plugins, total: result.total, hasMore: result.hasMore };
  }

  /**
   * Install plugin from marketplace
   */
  async installPlugin(
    pluginId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _onProgress?: (progress: number) => void
  ): Promise<Plugin> {
    return invokeCmd<Plugin>('marketplace_install', { packageName: pluginId });
  }

  /**
   * Check for plugin updates
   * Returns a list of plugins that have updates available
   */
  async checkUpdates(): Promise<PluginUpdateInfo[]> {
    return invokeCmd<PluginUpdateInfo[]>('marketplace_check_updates');
  }

  /**
   * Update a plugin to the latest version
   */
  async updatePlugin(packageName: string): Promise<Plugin> {
    return invokeCmd<Plugin>('marketplace_update', { packageName });
  }

  /**
   * Get plugin categories
   */
  getCategories(): PluginCategory[] {
    return ['productivity', 'developer', 'utilities', 'search', 'media', 'integration'];
  }
}

// Export singleton instances
export const pluginManagerService = new PluginManagerService();
export const marketplaceService = new MarketplaceService();

// Export default for backwards compatibility
export default pluginManagerService;
