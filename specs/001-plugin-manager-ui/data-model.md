# Data Model: 集成插件管理界面

**Feature**: 001-plugin-manager-ui
**Date**: 2025-01-01
**Purpose**: 定义插件管理相关的数据结构和实体关系

---

## Overview

本文档定义了插件管理界面的完整数据模型，包括核心实体的结构、状态转换、验证规则和关系图。

---

## Core Entities

### 1. Plugin (插件)

扩展现有的 `PluginManifest`，增加运行时状态和统计信息。

```typescript
interface Plugin {
  // === 继承自 PluginManifest ===
  id: string;                    // 唯一标识符
  name: string;                  // 插件名称
  version: string;               // 版本号 (semver)
  description: string;           // 描述
  author: string;                // 作者
  permissions: PluginPermission[]; // 权限列表
  triggers: string[];            // 触发器列表
  settings?: PluginSetting[];    // 配置项定义
  icon?: string;                 // 图标 URL 或 base64
  homepage?: string;             // 主页 URL
  repository?: string;           // 仓库 URL

  // === 新增运行时状态 ===
  enabled: boolean;              // 启用状态
  health: PluginHealth;          // 健康状态
  usageStats: PluginUsageStats;  // 使用统计
  installedAt: number;           // 安装时间戳 (ms)

  // === 运行时权限状态 ===
  grantedPermissions: Set<PluginPermission>; // 已授予的权限

  // === 当前配置值 ===
  configValues: Record<string, string | number | boolean>; // 配置项的当前值
}
```

#### 状态转换图

```
[安装] → INSTALLED (enabled=false, health=unknown)
   ↓
[启用] → ENABLED (enabled=true, health=healthy|warning|error)
   ↓
[禁用] → DISABLED (enabled=false, health=unchanged)
   ↓
[卸载] → UNINSTALLED (removed from registry)
```

#### 验证规则

| 字段 | 规则 | 错误消息 |
|------|------|----------|
| `id` | 必须匹配正则 `^[a-z0-9-]+$` | "插件 ID 只能包含小写字母、数字和连字符" |
| `version` | 必须是有效的 semver 格式 | "版本号格式无效 (例如: 1.0.0)" |
| `name` | 长度 1-50 字符 | "插件名称长度必须在 1-50 字符之间" |
| `description` | 最大长度 500 字符 | "描述不能超过 500 字符" |

---

### 2. PluginHealth (插件健康状态)

```typescript
type PluginHealthStatus = 'healthy' | 'warning' | 'error' | 'unknown';

interface PluginHealth {
  status: PluginHealthStatus;
  message?: string;              // 状态描述
  lastChecked: number;           // 最后检查时间戳 (ms)
  errors?: PluginError[];        // 错误列表 (当 status=error)
}

interface PluginError {
  code: string;                  // 错误代码
  message: string;               // 错误消息
  timestamp: number;             // 发生时间戳 (ms)
  context?: Record<string, unknown>; // 额外上下文
}
```

#### 健康状态判定规则

| 状态 | 触发条件 | 用户可见性 |
|------|----------|-----------|
| `healthy` | 插件正常加载，无错误记录 | 🟢 绿色指示器 |
| `warning` | 部分权限未授予，或配置缺失 | 🟡 黄色指示器 |
| `error` | 插件加载失败，或运行时异常 | 🔴 红色指示器 + 错误消息 |
| `unknown` | 插件从未被启用过 | ⚪ 灰色指示器 |

---

### 3. PluginUsageStats (插件使用统计)

```typescript
interface PluginUsageStats {
  lastUsed: number | null;       // 最后使用时间戳 (ms)
  usageCount: number;            // 累计使用次数
  lastExecutionTime?: number;    // 最后一次执行耗时 (ms)
  averageExecutionTime?: number; // 平均执行耗时 (ms)
}
```

#### 使用统计更新时机

- **lastUsed**: 每次插件被调用时更新
- **usageCount**: 每次插件被调用时 +1
- **lastExecutionTime**: 每次插件执行后记录
- **averageExecutionTime**: 使用移动平均计算

---

### 4. MarketplacePlugin (插件市场插件)

```typescript
interface MarketplacePlugin extends PluginManifest {
  // === 市场特定信息 ===
  downloadCount: number;         // 下载次数
  rating: number;                // 评分 (0-5)
  ratingCount: number;           // 评分人数
  category: PluginCategory;      // 分类

  // === 安装状态 ===
  installed: boolean;            // 是否已安装
  installedVersion?: string;     // 已安装版本 (如果安装了)
  updateAvailable: boolean;      // 是否有可用更新
  latestVersion: string;         // 最新版本号

  // === 元数据 ===
  screenshots?: string[];        // 截图 URL
  tags: string[];                // 标签
  publishedAt: number;           // 发布时间戳 (ms)
  updatedAt: number;             // 更新时间戳 (ms)
}

type PluginCategory =
  | 'productivity'   // 生产力
  | 'developer'      // 开发工具
  | 'utilities'      // 实用工具
  | 'search'         // 搜索增强
  | 'media'          // 媒体处理
  | 'integration';   // 第三方集成
```

---

### 5. BulkOperation (批量操作)

```typescript
interface BulkOperation {
  type: BulkOperationType;
  targetPluginIds: string[];     // 目标插件 ID 列表
  status: BulkOperationStatus;
  results: BulkOperationResult[];
  startedAt: number;             // 开始时间戳 (ms)
  completedAt?: number;          // 完成时间戳 (ms)
}

type BulkOperationType =
  | 'enable'
  | 'disable'
  | 'uninstall'
  | 'update';

type BulkOperationStatus =
  | 'pending'        // 等待执行
  | 'in_progress'    // 执行中
  | 'completed'      // 全部成功
  | 'partial_failure' // 部分失败
  | 'failed';        // 全部失败

interface BulkOperationResult {
  pluginId: string;
  success: boolean;
  error?: string;
}
```

---

## Entity Relationships

### 关系图

```
┌─────────────────┐
│   Plugin        │
├─────────────────┤
│ id (PK)         │───┬───< grantedPermissions (Permission)
│ name            │   │
│ enabled         │───┼───< health (PluginHealth)
│ health_id (FK)  │   │
│ usage_id (FK)   │   │
└─────────────────┘   │
       │              │
       │              └───< usageStats (PluginUsageStats)
       │
       │
       ▼
┌─────────────────┐       1:N
│ MarketplacePlugin│─────────────────┐
├─────────────────┤                   │
│ id (PK)         │                   │
│ downloadCount   │                   │
│ rating          │                   ▼
└─────────────────┘           ┌─────────────────┐
                              │ BulkOperation   │
                              ├─────────────────┤
                              │ targetPluginIds │
                              │ results[]       │
                              └─────────────────┘
```

### 关系说明

1. **Plugin (1) ↔ PluginHealth (0-1)**
   - 每个插件有零或一个健康状态记录
   - 健康状态由系统定期检查或事件触发更新

2. **Plugin (1) ↔ PluginUsageStats (0-1)**
   - 每个插件有零或一个使用统计记录
   - 统计在插件被调用时更新

3. **MarketplacePlugin (1) ↔ Plugin (0-1)**
   - MarketplacePlugin 是 PluginManifest 的扩展
   - 当插件被安装后，创建对应的 Plugin 实例

4. **BulkOperation (1) ↔ Plugin (N)**
   - 一个批量操作影响多个插件
   - 每个插件的结果记录在 `results[]` 中

---

## State Management

### PluginManager State (全局状态)

```typescript
interface PluginManagerState {
  // === 核心数据 ===
  plugins: Plugin[];                    // 已安装插件列表
  marketplacePlugins: MarketplacePlugin[]; // 市场插件列表

  // === UI 状态 ===
  currentView: 'installed' | 'marketplace'; // 当前视图
  selectedPluginIds: Set<string>;       // 选中的插件 ID
  detailPanelPluginId: string | null;   // 详情面板显示的插件

  // === 过滤和搜索 ===
  searchQuery: string;                  // 搜索关键词
  statusFilter: 'all' | 'enabled' | 'disabled'; // 状态过滤
  categoryFilter: PluginCategory | 'all'; // 分类过滤 (市场视图)

  // === 加载状态 ===
  loading: boolean;
  error: string | null;

  // === 批量操作 ===
  bulkOperation: BulkOperation | null;

  // === 通知 ===
  notifications: PluginNotification[];
}

interface PluginNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;  // 显示时长 (ms)
}
```

### State Transitions

```typescript
type PluginManagerAction =
  // === 数据加载 ===
  | { type: 'LOAD_PLUGINS_START' }
  | { type: 'LOAD_PLUGINS_SUCCESS'; payload: Plugin[] }
  | { type: 'LOAD_PLUGINS_ERROR'; payload: string }

  // === 插件操作 ===
  | { type: 'ENABLE_PLUGIN'; payload: string }
  | { type: 'DISABLE_PLUGIN'; payload: string }
  | { type: 'UNINSTALL_PLUGIN'; payload: string }

  // === 批量操作 ===
  | { type: 'BULK_ENABLE_START'; payload: string[] }
  | { type: 'BULK_ENABLE_PROGRESS'; payload: { pluginId: string; success: boolean } }
  | { type: 'BULK_ENABLE_COMPLETE' }

  // === 选择和过滤 ===
  | { type: 'TOGGLE_SELECTION'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: PluginManagerState['statusFilter'] }
  | { type: 'SET_CATEGORY_FILTER'; payload: PluginManagerState['categoryFilter'] }

  // === UI 状态 ===
  | { type: 'SET_VIEW'; payload: PluginManagerState['currentView'] }
  | { type: 'SHOW_DETAILS'; payload: string }
  | { type: 'HIDE_DETAILS' }

  // === 通知 ===
  | { type: 'SHOW_NOTIFICATION'; payload: Omit<PluginNotification, 'id'> }
  | { type: 'DISMISS_NOTIFICATION'; payload: string };
```

---

## Storage Strategy

### 持久化

| 数据 | 存储位置 | 格式 | 同步策略 |
|------|----------|------|----------|
| 插件列表 | SQLite (Rust) | JSON | 每次安装/卸载后写入 |
| 启用状态 | SQLite (Rust) | Boolean | 每次切换后写入 |
| 权限授予 | SQLite (Rust) | JSON 数组 | 每次变更后写入 |
| 配置值 | SQLite (Rust) | JSON 对象 | 每次更新后写入 |
| 使用统计 | SQLite (Rust) | JSON 对象 | 异步批量写入 |
| 视图偏好 | localStorage | JSON | 每次变更后写入 |

### Cache 策略

```typescript
// 前端缓存插件列表，减少 Tauri 调用
const CACHE_DURATION = 5 * 60 * 1000; // 5 分钟

interface PluginCache {
  plugins: Plugin[];
  timestamp: number;
}

function getCachedPlugins(): Plugin[] | null {
  const cached = localStorage.getItem('plugin_cache');
  if (!cached) return null;

  const { plugins, timestamp }: PluginCache = JSON.parse(cached);
  const isExpired = Date.now() - timestamp > CACHE_DURATION;

  return isExpired ? null : plugins;
}

function setCachedPlugins(plugins: Plugin[]): void {
  const cache: PluginCache = {
    plugins,
    timestamp: Date.now(),
  };
  localStorage.setItem('plugin_cache', JSON.stringify(cache));
}
```

---

## Performance Considerations

### 数据量假设

- **最大插件数**: 100
- **批量操作上限**: 50 个插件
- **市场插件数**: 500

### 优化策略

1. **分页加载**: 市场插件分页显示，每页 20 个
2. **虚拟滚动**: 当插件数 > 50 时启用
3. **懒加载详情**: 插件详情按需加载
4. **防抖搜索**: 搜索输入 300ms 防抖

### 内存估算

| 数据类型 | 单个大小 | 最大数量 | 总内存 |
|---------|---------|---------|--------|
| Plugin | ~2KB | 100 | ~200KB |
| MarketplacePlugin | ~1.5KB | 500 | ~750KB |
| PluginHealth | ~200B | 100 | ~20KB |
| **总计** | - | - | **~1MB** |

---

## Validation Rules Summary

### 插件 ID 验证

```typescript
function validatePluginId(id: string): ValidationResult {
  const pattern = /^[a-z0-9-]+$/;
  if (!pattern.test(id)) {
    return { valid: false, error: '插件 ID 只能包含小写字母、数字和连字符' };
  }
  if (id.length > 50) {
    return { valid: false, error: '插件 ID 长度不能超过 50 字符' };
  }
  return { valid: true };
}
```

### 版本号验证

```typescript
function validateVersion(version: string): ValidationResult {
  const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  if (!semverPattern.test(version)) {
    return { valid: false, error: '版本号必须是有效的 semver 格式 (例如: 1.0.0)' };
  }
  return { valid: true };
}
```

---

## Migration Notes

### 从现有数据模型迁移

1. **PluginManifest → Plugin**
   - 添加 `enabled`, `health`, `usageStats` 字段
   - 从数据库加载现有状态

2. **权限管理**
   - 从 `permissions[]` 扩展为 `permissions[]` + `grantedPermissions`

3. **配置管理**
   - 从 `settings[]` 扩展为 `settings[]` + `configValues`

### 向后兼容性

- 保持 `PluginManifest` 接口不变
- 新增字段都是可选的
- 现有插件无需修改即可工作

---

## Open Questions

1. **使用统计持久化频率**: 是否需要每次调用后都写入数据库，还是批量写入？
   - **建议**: 异步批量写入，每 10 秒或累计 10 次调用后写入

2. **健康状态检查频率**: 多久检查一次插件健康状态？
   - **建议**: 事件驱动（插件加载/执行时检查），而非定期轮询

3. **市场插件缓存**: 缓存市场插件列表多久？
   - **建议**: 5 分钟，用户可手动刷新

---

## Next Steps

- [ ] 创建 API contracts (frontend-api.md, tauri-commands.md)
- [ ] 实现 Rust 后端数据模型
- [ ] 实现 TypeScript 前端类型定义
