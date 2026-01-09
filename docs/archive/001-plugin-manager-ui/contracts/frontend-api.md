# Frontend API Contracts

**Feature**: 001-plugin-manager-ui
**Date**: 2025-01-01
**Purpose**: 定义前端服务层接口

---

## Overview

本文档定义了插件管理界面前端服务层的接口契约，包括：
- `PluginManagerService`: 插件管理服务
- `MarketplaceService`: 插件市场服务
- `PluginStateStore`: 插件状态管理接口

所有服务使用 TypeScript 接口定义，确保类型安全。

---

## 1. PluginManagerService

插件管理服务提供已安装插件的查询、修改和状态管理功能。

```typescript
/**
 * 插件管理服务接口
 */
interface PluginManagerService {
  // === 查询 ===

  /**
   * 获取所有已安装的插件
   * @returns 插件列表
   */
  getInstalledPlugins(): Promise<Plugin[]>;

  /**
   * 根据ID获取插件
   * @param pluginId 插件ID
   * @returns 插件对象，如果不存在则返回 null
   */
  getPlugin(pluginId: string): Promise<Plugin | null>;

  /**
   * 搜索插件（按名称、描述、作者）
   * @param query 搜索关键词
   * @param filters 过滤条件
   * @returns 匹配的插件列表
   */
  searchPlugins(
    query: string,
    filters?: PluginFilters
  ): Promise<Plugin[]>;

  // === 状态管理 ===

  /**
   * 启用插件
   * @param pluginId 插件ID
   * @throws PluginError 如果插件不存在或启用失败
   */
  enablePlugin(pluginId: string): Promise<void>;

  /**
   * 禁用插件
   * @param pluginId 插件ID
   * @throws PluginError 如果插件不存在或禁用失败
   */
  disablePlugin(pluginId: string): Promise<void>;

  /**
   * 批量启用插件
   * @param pluginIds 插件ID列表
   * @returns 批量操作结果
   */
  bulkEnablePlugins(pluginIds: string[]): Promise<BulkOperationResult>;

  /**
   * 批量禁用插件
   * @param pluginIds 插件ID列表
   * @returns 批量操作结果
   */
  bulkDisablePlugins(pluginIds: string[]): Promise<BulkOperationResult>;

  /**
   * 批量卸载插件
   * @param pluginIds 插件ID列表
   * @returns 批量操作结果
   */
  bulkUninstallPlugins(pluginIds: string[]): Promise<BulkOperationResult>;

  // === 权限管理 ===

  /**
   * 获取插件的权限状态
   * @param pluginId 插件ID
   * @returns 权限状态映射
   */
  getPluginPermissions(pluginId: string): Promise<PermissionStatusMap>;

  /**
   * 授予插件权限
   * @param pluginId 插件ID
   * @param permission 权限类型
   */
  grantPermission(pluginId: string, permission: PluginPermission): Promise<void>;

  /**
   * 撤销插件权限
   * @param pluginId 插件ID
   * @param permission 权限类型
   */
  revokePermission(pluginId: string, permission: PluginPermission): Promise<void>;

  // === 配置管理 ===

  /**
   * 获取插件配置
   * @param pluginId 插件ID
   * @returns 配置值映射
   */
  getPluginConfig(pluginId: string): Promise<PluginConfigMap>;

  /**
   * 更新插件配置
   * @param pluginId 插件ID
   * @param config 配置键值对
   */
  updatePluginConfig(pluginId: string, config: PluginConfigMap): Promise<void>;

  // === 健康状态 ===

  /**
   * 获取插件健康状态
   * @param pluginId 插件ID
   * @returns 健康状态对象
   */
  getPluginHealth(pluginId: string): Promise<PluginHealth>;

  /**
   * 刷新插件健康状态（重新检查）
   * @param pluginId 插件ID
   */
  refreshPluginHealth(pluginId: string): Promise<PluginHealth>;

  // === 统计 ===

  /**
   * 获取插件使用统计
   * @param pluginId 插件ID
   * @returns 使用统计对象
   */
  getPluginUsageStats(pluginId: string): Promise<PluginUsageStats>;

  // === 卸载 ===

  /**
   * 卸载插件
   * @param pluginId 插件ID
   * @param deleteConfig 是否同时删除配置数据
   */
  uninstallPlugin(pluginId: string, deleteConfig?: boolean): Promise<void>;
}
```

### 辅助类型

```typescript
/**
 * 插件过滤条件
 */
interface PluginFilters {
  status?: 'all' | 'enabled' | 'disabled';
  health?: PluginHealthStatus;
  category?: PluginCategory;
}

/**
 * 批量操作结果
 */
interface BulkOperationResult {
  total: number;                // 总操作数
  succeeded: number;            // 成功数
  failed: number;               // 失败数
  results: Map<string, {        // 每个插件的结果
    success: boolean;
    error?: string;
  }>;
}

/**
 * 权限状态映射
 */
type PermissionStatusMap = Map<PluginPermission, boolean>;

/**
 * 插件配置映射
 */
type PluginConfigMap = Record<string, string | number | boolean>;

/**
 * 插件错误
 */
class PluginError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PluginError';
  }
}
```

---

## 2. MarketplaceService

插件市场服务提供浏览、搜索和安装市场插件的功能。

```typescript
/**
 * 插件市场服务接口
 */
interface MarketplaceService {
  // === 查询 ===

  /**
   * 获取市场插件列表
   * @param options 查询选项
   * @returns 市场插件列表
   */
  getMarketplacePlugins(options?: MarketplaceQueryOptions): Promise<MarketplacePluginPage>;

  /**
   * 根据ID获取市场插件详情
   * @param pluginId 插件ID
   * @returns 市场插件详情
   */
  getMarketplacePlugin(pluginId: string): Promise<MarketplacePlugin>;

  /**
   * 搜索市场插件
   * @param query 搜索关键词
   * @param options 搜索选项
   * @returns 匹配的插件列表
   */
  searchMarketplace(
    query: string,
    options?: MarketplaceSearchOptions
  ): Promise<MarketplacePluginPage>;

  // === 安装/更新 ===

  /**
   * 安装插件
   * @param pluginId 插件ID
   * @param onProgress 安装进度回调
   * @returns 安装结果
   */
  installPlugin(
    pluginId: string,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<InstallResult>;

  /**
   * 更新插件
   * @param pluginId 插件ID
   * @param onProgress 更新进度回调
   * @returns 更新结果
   */
  updatePlugin(
    pluginId: string,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<UpdateResult>;

  /**
   * 检查插件更新
   * @returns 有可用更新的插件ID列表
   */
  checkUpdates(): Promise<string[]>;

  // === 评分 ===

  /**
   * 为插件评分
   * @param pluginId 插件ID
   * @param rating 评分 (1-5)
   */
  ratePlugin(pluginId: string, rating: number): Promise<void>;

  // === 分类 ===

  /**
   * 获取所有分类
   * @returns 分类列表
   */
  getCategories(): Promise<PluginCategory[]>;
}
```

### 辅助类型

```typescript
/**
 * 市场插件查询选项
 */
interface MarketplaceQueryOptions {
  category?: PluginCategory;
  page?: number;               // 页码 (从1开始)
  pageSize?: number;           // 每页数量 (默认20)
  sortBy?: 'name' | 'rating' | 'downloads' | 'updated';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 市场插件搜索选项
 */
interface MarketplaceSearchOptions extends MarketplaceQueryOptions {
  searchIn?: ('name' | 'description' | 'author' | 'tags')[];
}

/**
 * 市场插件分页结果
 */
interface MarketplacePluginPage {
  plugins: MarketplacePlugin[];
  total: number;               // 总数
  page: number;                // 当前页
  pageSize: number;            // 每页数量
  hasMore: boolean;            // 是否有更多
}

/**
 * 安装进度
 */
interface InstallProgress {
  stage: 'downloading' | 'installing' | 'verifying' | 'complete' | 'error';
  progress: number;            // 0-100
  message: string;             // 当前状态描述
  error?: string;              // 错误信息 (如果失败)
}

/**
 * 安装结果
 */
interface InstallResult {
  success: boolean;
  plugin?: Plugin;             // 安装成功的插件对象
  error?: string;
}

/**
 * 更新结果
 */
interface UpdateResult {
  success: boolean;
  previousVersion?: string;     // 更新前的版本
  newVersion?: string;         // 更新后的版本
  error?: string;
}
```

---

## 3. PluginStateStore

插件状态管理接口，使用 React Context + useReducer 模式。

```typescript
/**
 * 插件状态管理接口
 */
interface PluginStateStore {
  // === 状态 ===

  /**
   * 当前状态
   */
  getState(): PluginManagerState;

  /**
   * 订阅状态变化
   * @param listener 状态变化监听器
   * @returns 取消订阅函数
   */
  subscribe(listener: (state: PluginManagerState) => void): () => void;

  // === Actions ===

  /**
   * 分发 action
   * @param action Action 对象
   */
  dispatch(action: PluginManagerAction): void;

  // === 便捷方法 ===

  /**
   * 加载插件列表
   */
  loadPlugins(): Promise<void>;

  /**
   * 切换插件启用状态
   */
  togglePlugin(pluginId: string): Promise<void>;

  /**
   * 切换插件选择状态
   */
  toggleSelection(pluginId: string): void;

  /**
   * 全选/取消全选
   */
  toggleSelectAll(select: boolean): void;

  /**
   * 清除选择
   */
  clearSelection(): void;

  /**
   * 设置搜索关键词
   */
  setSearchQuery(query: string): void;

  /**
   * 设置状态过滤器
   */
  setStatusFilter(filter: PluginFilters['status']): void;

  /**
   * 设置分类过滤器
   */
  setCategoryFilter(category: PluginCategory | 'all'): void;

  /**
   * 切换视图
   */
  setView(view: 'installed' | 'marketplace'): void;

  /**
   * 显示插件详情
   */
  showDetails(pluginId: string): void;

  /**
   * 隐藏详情面板
   */
  hideDetails(): void;

  /**
   * 显示通知
   */
  showNotification(
    type: PluginNotification['type'],
    title: string,
    message: string,
    duration?: number
  ): void;

  /**
   * 解除通知
   */
  dismissNotification(notificationId: string): void;
}
```

### Hook 接口

```typescript
/**
 * 使用插件状态 Hook
 */
function usePluginState(): PluginManagerState;

/**
 * 使用插件管理器 Hook
 */
function usePluginManager(): {
  state: PluginManagerState;
  actions: {
    loadPlugins: () => Promise<void>;
    togglePlugin: (id: string) => Promise<void>;
    toggleSelection: (id: string) => void;
    toggleSelectAll: (select: boolean) => void;
    clearSelection: () => void;
    setSearchQuery: (query: string) => void;
    setStatusFilter: (filter: PluginFilters['status']) => void;
    setCategoryFilter: (category: PluginCategory | 'all') => void;
    setView: (view: 'installed' | 'marketplace') => void;
    showDetails: (id: string) => void;
    hideDetails: () => void;
    showNotification: (type: PluginNotification['type'], title: string, message: string) => void;
  };
};

/**
 * 使用批量选择 Hook
 */
function useBulkSelection(): {
  selectedIds: Set<string>;
  selectedCount: number;
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string) => void;
  selectAll: (allIds: string[]) => void;
  clearSelection: () => void;
};
```

---

## 4. Event Emitters

服务层需要发出的事件，用于组件订阅。

```typescript
/**
 * 插件管理事件
 */
interface PluginManagerEvents {
  // === 插件状态变更 ===

  /**
   * 插件已启用
   */
  'plugin:enabled': { pluginId: string };

  /**
   * 插件已禁用
   */
  'plugin:disabled': { pluginId: string };

  /**
   * 插件已卸载
   */
  'plugin:uninstalled': { pluginId: string };

  /**
   * 插件已更新
   */
  'plugin:updated': { pluginId: string; previousVersion: string; newVersion: string };

  // === 权限变更 ===

  /**
   * 权限已授予
   */
  'permission:granted': { pluginId: string; permission: PluginPermission };

  /**
   * 权限已撤销
   */
  'permission:revoked': { pluginId: string; permission: PluginPermission };

  // === 健康状态变更 ===

  /**
   * 插件健康状态变更
   */
  'health:changed': { pluginId: string; health: PluginHealth };

  // === 批量操作 ===

  /**
   * 批量操作开始
   */
  'bulk:start': { operation: BulkOperation };

  /**
   * 批量操作进度更新
   */
  'bulk:progress': { operation: BulkOperation; result: BulkOperationResult };

  /**
   * 批量操作完成
   */
  'bulk:complete': { operation: BulkOperation };

  // === 错误 ===

  /**
   * 插件错误
   */
  'plugin:error': { pluginId: string; error: PluginError };
}
```

---

## Implementation Notes

### 错误处理策略

所有服务方法应该：
1. 返回类型化的错误 (`PluginError`)
2. 包含错误代码和上下文信息
3. 提供用户友好的错误消息
4. 记录错误日志

### 异步操作模式

```typescript
// 推荐：使用 async/await
async function enablePlugin(pluginId: string): Promise<void> {
  try {
    await invoke('plugin_enable', { pluginId });
    // 更新状态
  } catch (error) {
    throw new PluginError('ENABLE_FAILED', '启用插件失败', { pluginId, error });
  }
}

// 推荐：带进度回调的异步操作
async function installPlugin(
  pluginId: string,
  onProgress?: (progress: InstallProgress) => void
): Promise<InstallResult> {
  onProgress?.({ stage: 'downloading', progress: 0, message: '开始下载' });

  try {
    // 下载阶段
    for (let i = 0; i <= 30; i++) {
      onProgress?.({ stage: 'downloading', progress: i, message: `下载中 ${i}%` });
      await delay(100);
    }

    // 安装阶段
    onProgress?.({ stage: 'installing', progress: 30, message: '开始安装' });
    await invoke('plugin_install', { pluginId });

    onProgress?.({ stage: 'complete', progress: 100, message: '安装完成' });
    return { success: true, plugin: await getPlugin(pluginId) };
  } catch (error) {
    onProgress?.({ stage: 'error', progress: 0, message: '安装失败', error: String(error) });
    return { success: false, error: String(error) };
  }
}
```

### 缓存策略

```typescript
class CachedPluginManagerService implements PluginManagerService {
  private cache = new Map<string, Plugin>();
  private cacheExpiry = 5 * 60 * 1000; // 5 分钟

  async getPlugin(pluginId: string): Promise<Plugin | null> {
    // 检查缓存
    const cached = this.cache.get(pluginId);
    if (cached && Date.now() - cached.cachedAt < this.cacheExpiry) {
      return cached.plugin;
    }

    // 从后端获取
    const plugin = await this.fetchPlugin(pluginId);
    if (plugin) {
      this.cache.set(pluginId, { plugin, cachedAt: Date.now() });
    }
    return plugin;
  }

  invalidateCache(pluginId?: string): void {
    if (pluginId) {
      this.cache.delete(pluginId);
    } else {
      this.cache.clear();
    }
  }
}
```

---

## Testing Contracts

### Mock 接口

```typescript
/**
 * Mock 插件管理服务（用于测试）
 */
class MockPluginManagerService implements PluginManagerService {
  private plugins: Plugin[] = [];

  async getInstalledPlugins(): Promise<Plugin[]> {
    return [...this.plugins];
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.find(p => p.id === pluginId);
    if (!plugin) throw new PluginError('NOT_FOUND', '插件不存在');
    plugin.enabled = true;
  }

  // ... 其他方法的模拟实现
}
```

### 测试示例

```typescript
describe('PluginManagerService', () => {
  it('should enable plugin', async () => {
    const service = new PluginManagerService();
    await service.enablePlugin('test-plugin');

    const plugin = await service.getPlugin('test-plugin');
    expect(plugin?.enabled).toBe(true);
  });

  it('should throw error when enabling non-existent plugin', async () => {
    const service = new PluginManagerService();

    await expect(service.enablePlugin('non-existent'))
      .rejects.toThrow(PluginError);
  });
});
```

---

## Next Steps

- [ ] 实现 `PluginManagerService` 类
- [ ] 实现 `MarketplaceService` 类
- [ ] 实现 `PluginStateStore` Context
- [ ] 创建自定义 Hooks
- [ ] 添加单元测试
