# Research Document: 集成插件管理界面

**Feature**: 001-plugin-manager-ui
**Date**: 2025-01-01
**Purpose**: 技术调研和决策记录

---

## Decision 1: 插件状态管理策略

### 问题
如何管理插件的全局状态（启用/禁用、安装状态、健康状态等），确保状态一致性并提供良好的开发者体验。

### 选项评估

| 选项 | 优点 | 缺点 |
|------|------|------|
| **React Context** | 内置 API，零额外依赖；适合中等复杂度状态；与 React 19 并发特性兼容 | 性能不如优化过的库；需要手动优化重渲染 |
| **Zustand** | 轻量（~1KB）；简单 API；自带 DevTools；持久化支持 | 额外依赖；学习曲线（虽然很低） |
| **Jotai** | 原子化状态；细粒度更新；TypeScript 友好 | 概念模型与 React 略有不同 |
| **React Query** | 强大的服务端状态管理；自动缓存、重试 | 主要为服务端状态设计；对于本地状态可能过度设计 |

### 决策: React Context + useReducer

**选择理由**:
1. **零额外依赖**: 项目已有所有必需的 API，不需要引入新的状态管理库
2. **状态复杂度适中**: 插件状态主要包括：
   - 已安装插件列表
   - 插件启用/禁用状态
   - 选中插件集合（用于批量操作）
   - 当前视图（已安装 / 插件市场）
   - 搜索和过滤状态

   这些状态的复杂度不需要专门的状态管理库。

3. **与 Tauri 的集成模式**: 插件状态的权威来源是 Rust 后端（通过 Tauri commands），前端状态只是缓存。使用 Context + useReducer 可以很好地实现：
   ```
   User Action → dispatch(action) → Tauri Command → Update Backend → dispatch(success) → Update UI
   ```

4. **React 19 优化**: React 19 改进了 Context 的性能，减少了不必要的重渲染

### 实现模式

```typescript
// services/pluginStateStore.ts
interface PluginState {
  plugins: Plugin[];
  selectedIds: Set<string>;
  filter: 'all' | 'enabled' | 'disabled';
  searchQuery: string;
  loading: boolean;
}

type PluginAction =
  | { type: 'SET_PLUGINS'; payload: Plugin[] }
  | { type: 'TOGGLE_SELECTION'; payload: string }
  | { type: 'ENABLE_PLUGIN'; payload: string }
  | { type: 'DISABLE_PLUGIN'; payload: string }
  | { type: 'SET_FILTER'; payload: PluginState['filter'] }
  | { type: 'SET_SEARCH'; payload: string };

export const PluginStateContext = createContext<PluginState | null>(null);
export const PluginDispatchContext = createContext<Dispatch<PluginAction> | null>(null);
```

### 持久化策略

- **插件启用状态**: 由 Rust 后端持久化到 SQLite
- **视图选择和过滤状态**: 使用 `localStorage` 保存用户偏好
- **选中状态**: 不持久化（每次会话重新开始）

---

## Decision 2: 批量操作 UI 模式

### 问题
如何实现插件的批量选择和批量操作，确保用户体验直观且高效。

### 参考: VSCode 扩展管理器

VSCode 的扩展管理界面是业界标杆：
1. 复选框在列表项左侧，点击可选择
2. 选中任何项时，顶部出现批量操作工具栏
3. 工具栏显示选中数量，并提供常用操作（全部禁用、卸载等）
4. 单个列表项的操作按钮仍然可用

### 决策: 复选框 + 顶部工具栏

**UI 布局**:
```
┌─────────────────────────────────────────────────┐
│ 🔍 [搜索框...]    [全部▼] [已启用] [已禁用]    │
│                                                │
│ ☑ QR码生成器      🟢 已启用      [⚙️] [卸载]   │
│ ☐ 天气查询        🔴 已禁用      [⚙️] [卸载]   │
│ ☑ 颜色转换器      🟢 已启用      [⚙️] [卸载]   │
│                                                │
│ ┌─ 批量操作 (3) ──────────────────────────────┐ │
│ │ [批量启用] [批量禁用] [批量卸载]            │ │
│ └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**交互细节**:
1. **选择模式**: 点击复选框选择单个插件，Shift+点击选择范围
2. **全选**: 列表标题提供"全选"复选框
3. **工具栏位置**: 固定在列表顶部（当有选中项时出现）
4. **确认对话框**: 批量卸载需要二次确认，显示受影响的插件列表
5. **视觉反馈**: 选中的列表项高亮显示

### 实现策略

使用独立的 Hook 管理批量选择状态：

```typescript
// hooks/useBulkSelection.ts
export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = (allIds: string[]) => setSelectedIds(new Set(allIds));
  const clearSelection = () => setSelectedIds(new Set());

  const isSelected = (id: string) => selectedIds.has(id);
  const selectedCount = selectedIds.size;

  return { selectedIds, toggleSelection, selectAll, clearSelection, isSelected, selectedCount };
}
```

---

## Decision 3: 插件健康状态检测

### 问题
如何检测和报告插件的健康状态（健康、警告、错误），帮助用户了解插件运行情况。

### 选项评估

| 选项 | 优点 | 缺点 |
|------|------|------|
| **主动心跳** | 实时检测；可配置检测间隔 | 增加系统开销；插件需要实现心跳接口 |
| **被动错误捕获** | 实现简单；零额外开销 | 无法检测"无响应"状态；只在报错时才知道 |
| **混合模式** | 平衡实时性和开销 | 实现复杂度较高 |

### 决策: 被动错误捕获 + 基本健康检查

**选择理由**:
1. **轻量级**: 不需要插件实现心跳接口，减少插件开发负担
2. **符合需求**: 大多数错误（权限缺失、依赖缺失）会在插件加载或执行时暴露
3. **渐进增强**: 未来可以添加主动心跳机制作为可选功能

### 健康状态定义

| 状态 | 触发条件 | 指示器颜色 |
|------|----------|-----------|
| **healthy** | 插件正常加载，最近无错误 | 🟢 绿色 |
| **warning** | 插件缺少部分权限或配置 | 🟡 黄色 |
| **error** | 插件加载失败、执行错误、版本不兼容 | 🔴 红色 |
| **unknown** | 插件从未被使用过 | ⚪ 灰色 |

### 检测机制

1. **加载时检测**:
   - 插件加载失败 → `error` 状态
   - 权限被拒绝 → `warning` 状态

2. **运行时监控**:
   - 捕获插件执行时的异常 → `error` 状态
   - 记录最后使用时间 → 用于判断 "unknown" 状态

3. **健康检查命令**:
   ```rust
   #[tauri::command]
   pub async fn check_plugin_health(plugin_id: &str) -> PluginHealth {
       // 检查插件文件是否存在
       // 检查权限是否被授予
       // 检查最近是否有错误记录
       // 返回健康状态
   }
   ```

### 实现策略

在 `pluginLoader.ts` 中添加错误监听：

```typescript
export function setupPluginHealthMonitoring() {
  // 监听插件加载错误
  pluginLoader.onError((pluginId, error) => {
    updatePluginHealth(pluginId, 'error', error.message);
  });

  // 监听插件权限变更
  pluginLoader.onPermissionChange((pluginId, permissions) => {
    const missing = permissions.filter(p => !p.granted);
    const health = missing.length > 0 ? 'warning' : 'healthy';
    updatePluginHealth(pluginId, health, `Missing permissions: ${missing.map(p => p.name).join(', ')}`);
  });
}
```

---

## Decision 4: 虚拟滚动实现

### 问题
插件列表可能包含 50+ 个插件，是否需要虚拟滚动来优化性能？

### 性能分析

**假设**: 最多 100 个插件，每个列表项高度约 80px

| 方案 | 渲染节点数 | 内存占用 | 滚动性能 |
|------|-----------|----------|---------|
| **原生滚动** | 100 | ~5MB | 良好（现代浏览器） |
| **react-window** | ~10 | ~0.5MB | 优秀 |

### 决策: 暂不使用虚拟滚动

**选择理由**:
1. **数量未达标**: 100 个插件对现代浏览器来说不是问题
2. **增加复杂度**: 虚拟滚动引入额外的复杂度（动态高度、焦点管理、可访问性）
3. **收益不明显**: 用户很少会滚动浏览 100 个插件

**条件**: 如果未来插件数量超过 200 个，再考虑引入虚拟滚动。

### 替代优化策略

1. **分页**: 显示 20-30 个插件，底部提供"加载更多"按钮
2. **懒加载**: 只渲染可见区域附近的元素（使用 `content-visibility: auto`）
3. **防抖搜索**: 搜索输入使用 150-300ms 防抖

### CSS 优化

```css
.plugin-list-item {
  /* 告诉浏览器可以跳过不可见内容的渲染 */
  contain: layout style paint;
  /* 启用内容可见性优化 */
  content-visibility: auto;
  /* 预估高度，帮助浏览器计算滚动 */
  contain-intrinsic-size: 0 80px;
}
```

---

## Decision 5: 插件市场数据源

### 问题
开发阶段使用什么数据源来展示插件市场功能？

### 选项评估

| 选项 | 优点 | 缺点 |
|------|------|------|
| **在线 API** | 真实的插件市场体验；数据实时更新 | 依赖网络；需要服务器；开发阶段可能不存在 |
| **本地 JSON 文件** | 简单；无网络依赖；易于测试 | 数据静态；无法演示安装流程 |
| **Mock Service** | 可模拟网络延迟和错误；可控的测试环境 | 需要额外实现 |

### 决策: 本地 Mock 数据（渐进式）

**选择理由**:
1. **快速开发**: 不依赖外部服务，可以立即开始开发
2. **可控测试**: 可以模拟各种场景（网络错误、空列表等）
3. **渐进迁移**: 未来可以轻松切换到真实 API

### 实现策略

**阶段 1: 静态 JSON**
```typescript
// services/marketplaceService.ts
const MOCK_PLUGINS: MarketplacePlugin[] = [
  {
    id: 'qrcode-generator',
    name: 'QR 码生成器',
    description: '快速生成二维码',
    version: '1.0.0',
    author: 'Kaka Team',
    category: 'utilities',
    downloadCount: 12345,
    rating: 4.8,
    installed: true,
  },
  // ... more plugins
];

export async function fetchMarketplacePlugins(): Promise<MarketplacePlugin[]> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_PLUGINS;
}
```

**阶段 2: 可配置切换**
```typescript
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_MARKETPLACE === 'true';

export async function fetchMarketplacePlugins(): Promise<MarketplacePlugin[]> {
  if (USE_MOCK_DATA) {
    return getMockPlugins();
  }

  // 调用真实 API
  const response = await fetch('https://plugins.example.com/api/plugins');
  return response.json();
}
```

**未来**: 当真实 API 准备就绪，只需设置环境变量 `VITE_USE_MOCK_MARKETPLACE=false`

---

## Decision 6: UI 组件库选择

### 问题
是否引入额外的 UI 组件库（如 shadcn/ui、Radix UI）？

### 现有组件分析

项目已有自定义组件：
- `Button`, `Input`, `Card`, `Badge`, `Spinner`, `Kbd`, `Skeleton`
- 完整的 CSS 设计系统（`src/styles/design-tokens.css`）

### 决策: 不引入新的组件库

**选择理由**:
1. **已有完善的设计系统**: 项目包含完整的 UI 组件库和设计令牌
2. **避免增加包体积**: 组件库会增加打包体积
3. **一致性**: 保持现有 UI 风格的一致性
4. **学习成本**: 团队已经熟悉现有组件

### 复用的现有组件

- `Button`: 用于操作按钮
- `Input`: 用于搜索框
- `Badge`: 用于状态标签、权限标签
- `Spinner`: 用于加载状态
- `Card`: 用于插件卡片
- `Kbd`: 用于快捷键提示

### 新增组件

只需要创建插件管理特定的组件：
- `BulkActionsToolbar`: 批量操作工具栏
- `PluginListItem`: 增强的插件列表项（带复选框）
- `PluginDetailPanel`: 插件详情面板

---

## Decision 7: TypeScript 配置和类型安全

### 决策: 启用严格模式

**配置**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**类型定义策略**:
- 所有插件相关类型定义在 `src/types/plugin.ts`
- 使用 ` branded types` 防止插件 ID 混淆：

```typescript
type PluginId = string & { readonly __brand: unique symbol };

function createPluginId(id: string): PluginId {
  return id as PluginId;
}

// 类型安全：不能将普通 string 当作 PluginId 使用
function getPlugin(id: PluginId) { /* ... */ }
getPlugin("abc"); // ❌ Type error
getPlugin(createPluginId("abc")); // ✅ OK
```

---

## Decision 8: 测试策略

### 单元测试

**工具**: Vitest + @testing-library/react

**覆盖目标**:
- 组件测试: 所有新增组件的交互逻辑
- 服务测试: 插件管理服务的业务逻辑
- Hook 测试: 自定义 Hook 的状态管理

**示例**:
```typescript
describe('PluginManager', () => {
  it('should toggle plugin enabled state', async () => {
    const { getByLabelText, user } = render(<PluginManager />);

    const toggle = getByLabelText('Toggle QR码生成器');
    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
  });
});
```

### 集成测试

**工具**: Playwright

**测试场景**:
- 完整的插件启用/禁用流程
- 批量操作流程
- 插件搜索和安装流程

**示例**:
```typescript
test('user can install plugin from marketplace', async ({ page }) => {
  await page.goto('/settings/plugins');
  await page.click('[data-tab="marketplace"]');
  await page.fill('input[placeholder="搜索插件"]', 'color');
  await page.click('text=颜色转换器');
  await page.click('text=安装');
  await expect(page.locator('.plugin-list-item >> text=颜色转换器')).toBeVisible();
});
```

### 测试覆盖率目标

- **单元测试**: ≥ 80%
- **关键路径**: 100%（插件启用/禁用、安装/卸载）

---

## 总结: 技术栈决策

| 领域 | 选择 | 理由 |
|------|------|------|
| **状态管理** | React Context + useReducer | 零依赖，适合中等复杂度 |
| **批量操作** | 复选框 + 顶部工具栏 | 参考 VSCode，用户熟悉 |
| **健康检测** | 被动错误捕获 | 轻量级，足够需求 |
| **虚拟滚动** | 暂不使用 | 100 个插件不需要 |
| **市场数据** | Mock 数据 + 渐进切换 | 快速开发，易于测试 |
| **组件库** | 不引入，使用现有组件 | 保持一致性 |
| **类型安全** | TypeScript strict mode | 防止运行时错误 |
| **测试** | Vitest + Playwright | 项目已有配置 |

---

## 下一步

Phase 0 研究完成，可以进入 Phase 1: Design & Contracts
- 创建 [data-model.md](./data-model.md)
- 创建 contracts/ 目录和 API 契约
- 创建 [quickstart.md](./quickstart.md)
