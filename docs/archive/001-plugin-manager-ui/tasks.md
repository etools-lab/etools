# Tasks: 集成插件管理界面

**Input**: Design documents from `/specs/001-plugin-manager-ui/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Feature Branch**: `001-plugin-manager-ui`

**Tests**: 项目建议原则包含"测试驱动"，新组件应包含单元测试。

**Organization**: 任务按用户故事分组，每个故事可独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事（US1, US2, US3, US4）
- 包含精确文件路径

## Path Conventions

本项目为 Tauri 桌面应用，路径约定：
- **前端**: `src/` (React 组件、服务、Hooks)
- **后端**: `src-tauri/src/` (Rust 服务、命令)
- **测试**: `tests/unit/`, `tests/integration/`

---

## Phase 1: Setup (项目初始化)

**Purpose**: 创建项目结构和基础配置

- [ ] T001 创建 PluginManager 目录结构 src/components/PluginManager/
- [ ] T002 创建 services 目录结构 src/services/pluginManager.ts, pluginStateStore.ts, marketplaceService.ts
- [ ] T003 创建 hooks 目录结构 src/hooks/usePluginManager.ts, usePluginState.ts, useBulkSelection.ts
- [ ] T004 创建后端服务文件 src-tauri/src/services/plugin_service.rs, marketplace_service.rs
- [ ] T005 创建后端命令文件 src-tauri/src/cmds/marketplace.rs
- [ ] T006 创建测试文件目录 tests/unit/components/, tests/unit/services/, tests/integration/

---

## Phase 2: Foundational (阻塞性前置条件)

**Purpose**: 所有用户故事依赖的核心基础设施，必须在任何用户故事开始前完成

**⚠️ CRITICAL**: 此阶段完成前，不能开始任何用户故事的实现

### 类型定义扩展

- [ ] T007 [P] 扩展插件类型定义，添加 Plugin, PluginHealth, PluginUsageStats 到 src/types/plugin.ts
- [ ] T008 [P] 定义 MarketplacePlugin, BulkOperation 类型到 src/types/plugin.ts
- [ ] T009 [P] 定义 PluginManagerState 和 PluginManagerAction 类型到 src/types/plugin.ts

### 后端数据模型

- [ ] T010 [P] 在 src-tauri/src/models/plugin.rs 中实现 Rust PluginHealth 结构体
- [ ] T011 [P] 在 src-tauri/src/models/plugin.rs 中实现 Rust PluginUsageStats 结构体
- [ ] T012 在 src-tauri/src/models/plugin.rs 中扩展 Plugin 结构体，添加 enabled, health 字段

### 后端服务层

- [ ] T013 实现 PluginService 基础框架在 src-tauri/src/services/plugin_service.rs（包含数据库连接初始化）
- [ ] T014 实现 MarketplaceService 基础框架在 src-tauri/src/services/marketplace_service.rs
- [ ] T015 添加错误处理和日志记录到 src-tauri/src/services/plugin_service.rs

### 前端状态管理

- [ ] T016 创建 PluginStateStore Context 框架在 src/services/pluginStateStore.ts（包含 Provider, reducer, hooks）
- [ ] T017 创建 pluginManager.ts 服务框架在 src/services/pluginManager.ts（包含 Tauri 命令包装）

**Checkpoint**: 基础设施就绪 - 用户故事实现可以并行开始

---

## Phase 3: User Story 1 - 统一插件管理中心 (Priority: P1) 🎯 MVP

**Goal**: 创建统一的插件管理界面，支持查看已安装插件和启用/禁用操作

**Independent Test**: 打开应用设置 → 插件管理，能看到所有已安装插件列表，并能启用/禁用插件

### 测试 (US1)

> **NOTE: 先编写测试，确保测试失败后再实现功能**

- [ ] T018 [P] [US1] 编写 PluginManager 组件单元测试到 tests/unit/components/PluginManager/PluginManager.test.tsx
- [ ] T019 [P] [US1] 编写 PluginList 组件单元测试到 tests/unit/components/PluginManager/PluginList.test.tsx
- [ ] T020 [P] [US1] 编写 pluginManager 服务单元测试到 tests/unit/services/pluginManager.test.ts
- [ ] T021 [US1] 编写插件管理集成测试到 tests/integration/plugin-management.test.ts

### 后端实现 (US1)

- [ ] T022 [P] [US1] 实现 plugin_enable Tauri 命令到 src-tauri/src/cmds/plugins.rs
- [ ] T023 [P] [US1] 实现 plugin_disable Tauri 命令到 src-tauri/src/cmds/plugins.rs
- [ ] T024 [P] [US1] 实现 plugin_list Tauri 命令扩展到 src-tauri/src/cmds/plugins.rs（返回包含 enabled 字段的列表）
- [ ] T025 [US1] 在 src-tauri/src/services/plugin_service.rs 中实现启用/禁用插件业务逻辑
- [ ] T026 [US1] 在 src-tauri/src/lib.rs 中注册新命令

### 前端组件 (US1)

- [ ] T027 [P] [US1] 创建 PluginManager 主组件到 src/components/PluginManager/PluginManager.tsx（标签切换容器）
- [ ] T028 [P] [US1] 创建 InstalledPluginsView 组件到 src/components/PluginManager/InstalledPluginsView.tsx
- [ ] T029 [P] [US1] 创建 PluginList 组件到 src/components/PluginManager/PluginList.tsx（支持搜索和过滤）
- [ ] T030 [P] [US1] 创建 PluginManager.css 到 src/components/PluginManager/PluginManager.css
- [ ] T031 [P] [US1] 创建 InstalledPluginsView.css 到 src/components/PluginManager/InstalledPluginsView.css
- [ ] T032 [P] [US1] 创建 PluginList.css 到 src/components/PluginManager/PluginList.css

### 前端服务层 (US1)

- [ ] T033 [US1] 实现 PluginManagerService.getInstalledPlugins() 到 src/services/pluginManager.ts
- [ ] T034 [US1] 实现 PluginManagerService.enablePlugin() 到 src/services/pluginManager.ts
- [ ] T035 [US1] 实现 PluginManagerService.disablePlugin() 到 src/services/pluginManager.ts
- [ ] T036 [US1] 实现 pluginStateStore 的插件操作 action 处理到 src/services/pluginStateStore.ts

### Hooks (US1)

- [ ] T037 [P] [US1] 创建 usePluginManager Hook 到 src/hooks/usePluginManager.ts
- [ ] T038 [P] [US1] 创建 usePluginState Hook 到 src/hooks/usePluginState.ts

### 集成 (US1)

- [ ] T039 [US1] 在 PluginManager 中集成 InstalledPluginsView 和状态管理
- [ ] T040 [US1] 在 InstalledPluginsView 中集成 PluginList 和搜索过滤功能
- [ ] T041 [US1] 在 PluginList 中实现启用/禁用开关交互
- [ ] T042 [US1] 添加搜索和过滤功能到 InstalledPluginsView
- [ ] T043 [US1] 在 src/App.tsx 中添加插件管理入口

**Checkpoint**: User Story 1 完成 - 用户可以查看并启用/禁用插件，独立功能可验证

---

## Phase 4: User Story 2 - 批量插件管理 (Priority: P2)

**Goal**: 支持批量选择和批量操作多个插件

**Independent Test**: 选择多个插件后点击批量操作按钮，验证所有选中插件状态变化

### 测试 (US2)

- [ ] T044 [P] [US2] 编写 BulkActionsToolbar 组件单元测试到 tests/unit/components/PluginManager/BulkActionsToolbar.test.tsx
- [ ] T045 [P] [US2] 编写 useBulkSelection Hook 单元测试到 tests/unit/hooks/useBulkSelection.test.ts
- [ ] T046 [US2] 编写批量操作集成测试到 tests/integration/bulk-operations.test.ts

### 后端实现 (US2)

- [ ] T047 [P] [US2] 实现 plugin_bulk_enable Tauri 命令到 src-tauri/src/cmds/plugins.rs
- [ ] T048 [P] [US2] 实现 plugin_bulk_disable Tauri 命令到 src-tauri/src/cmds/plugins.rs
- [ ] T049 [P] [US2] 实现 plugin_bulk_uninstall Tauri 命令到 src-tauri/src/cmds/plugins.rs
- [ ] T050 [US2] 在 src-tauri/src/services/plugin_service.rs 中实现批量操作业务逻辑
- [ ] T051 [US2] 在 src-tauri/src/lib.rs 中注册批量操作命令

### 前端组件 (US2)

- [ ] T052 [P] [US2] 创建 BulkActionsToolbar 组件到 src/components/PluginManager/BulkActionsToolbar.tsx
- [ ] T053 [P] [US2] 创建 BulkActionsToolbar.css 到 src/components/PluginManager/BulkActionsToolbar.css
- [ ] T054 [US2] 增强 PluginListItem 组件，添加复选框到 src/components/PluginManager/PluginListItem.tsx

### 前端服务层 (US2)

- [ ] T055 [US2] 实现 PluginManagerService.bulkEnablePlugins() 到 src/services/pluginManager.ts
- [ ] T056 [US2] 实现 PluginManagerService.bulkDisablePlugins() 到 src/services/pluginManager.ts
- [ ] T057 [US2] 实现 PluginManagerService.bulkUninstallPlugins() 到 src/services/pluginManager.ts

### Hooks (US2)

- [ ] T058 [P] [US2] 创建 useBulkSelection Hook 到 src/hooks/useBulkSelection.ts
- [ ] T059 [US2] 在 pluginStateStore 中添加批量操作 action 处理到 src/services/pluginStateStore.ts

### 集成 (US2)

- [ ] T060 [US2] 在 PluginList 中集成复选框功能
- [ ] T061 [US2] 在 InstalledPluginsView 中集成 BulkActionsToolbar
- [ ] T062 [US2] 实现批量操作的确认对话框
- [ ] T063 [US2] 实现批量操作的进度显示和错误处理

**Checkpoint**: User Story 2 完成 - 用户可以批量操作插件，独立功能可验证

---

## Phase 5: User Story 4 - 插件市场集成 (Priority: P2)

**Goal**: 在插件管理界面集成插件市场，支持浏览、搜索和安装新插件

**Independent Test**: 点击插件市场标签，能浏览插件列表并安装新插件

### 测试 (US4)

- [ ] T064 [P] [US4] 编写 MarketplaceView 组件单元测试到 tests/unit/components/PluginManager/MarketplaceView.test.tsx
- [ ] T065 [P] [US4] 编写 marketplaceService 服务单元测试到 tests/unit/services/marketplaceService.test.ts
- [ ] T066 [US4] 编写插件市场集成测试到 tests/integration/marketplace.test.ts

### 后端实现 (US4)

- [ ] T067 [P] [US4] 实现 marketplace_list Tauri 命令到 src-tauri/src/cmds/marketplace.rs
- [ ] T068 [P] [US4] 实现 marketplace_search Tauri 命令到 src-tauri/src/cmds/marketplace.rs
- [ ] T069 [P] [US4] 实现 marketplace_install Tauri 命令到 src-tauri/src/cmds/marketplace.rs
- [ ] T070 [P] [US4] 实现 marketplace_check_updates Tauri 命令到 src-tauri/src/cmds/marketplace.rs
- [ ] T071 [US4] 在 src-tauri/src/services/marketplace_service.rs 中实现市场插件业务逻辑
- [ ] T072 [US4] 在 src-tauri/src/assets/marketplace/ 创建模拟插件数据
- [ ] T073 [US4] 在 src-tauri/src/lib.rs 中注册市场命令

### 前端组件 (US4)

- [ ] T074 [P] [US4] 创建 MarketplaceView 组件到 src/components/PluginManager/MarketplaceView.tsx
- [ ] T075 [P] [US4] 创建 MarketplaceView.css 到 src/components/PluginManager/MarketplaceView.css
- [ ] T076 [US4] 复用并整合现有的 MarketplacePluginCard 组件

### 前端服务层 (US4)

- [ ] T077 [US4] 实现 MarketplaceService.getMarketplacePlugins() 到 src/services/marketplaceService.ts
- [ ] T078 [US4] 实现 MarketplaceService.searchMarketplace() 到 src/services/marketplaceService.ts
- [ ] T079 [US4] 实现 MarketplaceService.installPlugin() 到 src/services/marketplaceService.ts（带进度回调）
- [ ] T080 [US4] 实现 MarketplaceService.checkUpdates() 到 src/services/marketplaceService.ts

### 集成 (US4)

- [ ] T081 [US4] 在 PluginManager 中添加 MarketplaceView 标签切换
- [ ] T082 [US4] 在 MarketplaceView 中实现搜索和分类过滤功能
- [ ] T083 [US4] 在 MarketplaceView 中集成插件安装流程（复用 PluginInstaller）
- [ ] T084 [US4] 实现已安装插件标识和更新提示
- [ ] T085 [US4] 添加网络错误处理和离线状态显示

**Checkpoint**: User Story 4 完成 - 用户可以浏览和安装市场插件，独立功能可验证

---

## Phase 6: User Story 3 - 插件状态可视化 (Priority: P3)

**Goal**: 显示插件健康状态和使用统计信息

**Independent Test**: 查看插件列表，每个插件显示状态指示器（绿色/黄色/红色）

### 测试 (US3)

- [ ] T086 [P] [US3] 编写插件健康状态检测单元测试到 tests/unit/services/pluginManager.health.test.ts
- [ ] T087 [US3] 编写状态可视化集成测试到 tests/integration/plugin-health.test.ts

### 后端实现 (US3)

- [ ] T088 [P] [US3] 实现 plugin_get_health Tauri 命令到 src-tauri/src/cmds/plugins.rs
- [ ] T089 [P] [US3] 实现 plugin_check_health Tauri 命令到 src-tauri/src/cmds/plugins.rs
- [ ] T090 [P] [US3] 实现 plugin_get_usage_stats Tauri 命令到 src-tauri/src/cmds/plugins.rs
- [ ] T091 [US3] 在 src-tauri/src/services/plugin_service.rs 中实现健康检查逻辑
- [ ] T092 [US3] 在 src-tauri/src/services/plugin_service.rs 中实现使用统计收集逻辑
- [ ] T093 [US3] 在 src-tauri/src/lib.rs 中注册健康检查命令

### 前端组件 (US3)

- [ ] T094 [P] [US3] 创建 PluginDetailPanel 组件到 src/components/PluginManager/PluginDetailPanel.tsx
- [ ] T095 [P] [US3] 创建 PluginDetailPanel.css 到 src/components/PluginManager/PluginDetailPanel.css
- [ ] T096 [US3] 在 PluginListItem 中添加状态指示器到 src/components/PluginManager/PluginListItem.tsx

### 前端服务层 (US3)

- [ ] T097 [US3] 实现 PluginManagerService.getPluginHealth() 到 src/services/pluginManager.ts
- [ ] T098 [US3] 实现 PluginManagerService.refreshPluginHealth() 到 src/services/pluginManager.ts
- [ ] T099 [US3] 实现 PluginManagerService.getPluginUsageStats() 到 src/services/pluginManager.ts

### 集成 (US3)

- [ ] T100 [US3] 在 PluginListItem 中显示健康状态指示器
- [ ] T101 [US3] 在 PluginDetailPanel 中显示插件详细信息（权限、配置、统计）
- [ ] T102 [US3] 实现权限开关交互
- [ ] T103 [US3] 实现配置项编辑交互
- [ ] T104 [US3] 添加错误信息展示和建议解决方案

**Checkpoint**: User Story 3 完成 - 用户可以看到插件健康状态和统计信息，独立功能可验证

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 跨多个用户故事的改进和优化

- [ ] T105 [P] 在所有插件组件中应用统一的设计系统（CSS 变量）
- [ ] T106 [P] 添加加载状态和骨架屏到 src/components/PluginManager/
- [ ] T107 [P] 实现通知系统（Toast/Alert）到 src/components/PluginManager/
- [ ] T108 添加键盘快捷键支持（如 Cmd+A 全选）
- [ ] T109 实现插件列表的虚拟滚动（如果插件数 > 50）
- [ ] T110 添加性能优化（防抖搜索、React.memo 优化）
- [ ] T111 [P] 补充遗漏的单元测试到各组件
- [ ] T112 运行完整测试套件并修复失败测试
- [ ] T113 [P] 代码清理和重构（移除未使用代码、统一命名）
- [ ] T114 更新 README.md 文档，添加插件管理功能说明
- [ ] T115 执行 quickstart.md 中的验证步骤

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 - 阻塞所有用户故事
- **User Stories (Phase 3-6)**: 全部依赖 Foundational 完成
  - US1 (P1) - 核心功能，建议优先实现
  - US2 (P2) - 可与 US4 并行开发
  - US4 (P2) - 可与 US2 并行开发
  - US3 (P3) - 可独立开发
- **Polish (Phase 7)**: 依赖所有期望的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成后可开始 - 无其他故事依赖
- **User Story 2 (P2)**: Foundational 完成后可开始 - 与 US1 独立，可并行开发
- **User Story 4 (P2)**: Foundational 完成后可开始 - 与 US1/US2 独立，可并行开发
- **User Story 3 (P3)**: Foundational 完成后可开始 - 可独立开发，不依赖其他故事

### Within Each User Story

- 测试任务（如果包含）必须在实现前编写并验证失败
- 后端命令优先于前端服务层
- 前端服务层优先于组件集成
- 不同文件的 [P] 任务可并行执行

### Parallel Opportunities

**Setup Phase**:
```bash
# 所有目录创建任务可并行:
T001-T006 可同时执行
```

**Foundational Phase**:
```bash
# 类型定义可并行:
T007-T009 可同时执行

# Rust 结构体可并行:
T010-T011 可同时执行
```

**User Story 1**:
```bash
# 测试可并行:
T018-T020 可同时编写

# 后端命令可并行:
T022-T024 可同时实现

# 组件创建可并行:
T027-T032 可同时创建文件
```

**跨用户故事** (Foundational 完成后):
```bash
# 不同开发者可并行处理:
- Developer A: US1 (Phase 3)
- Developer B: US2 (Phase 4)
- Developer C: US4 (Phase 5)
- Developer D: US3 (Phase 6)
```

---

## Parallel Example: Foundational Phase Completion

```bash
# Foundational 完成后的并行启动：

# Team A - User Story 1 (核心功能)
T022-T024: 后端命令
T027-T032: 前端组件
T033-T036: 服务层

# Team B - User Story 2 (批量操作)
T047-T049: 后端命令
T052-T054: 前端组件
T055-T057: 服务层

# Team C - User Story 4 (插件市场)
T067-T070: 后端命令
T074-T076: 前端组件
T077-T080: 服务层
```

---

## Implementation Strategy

### MVP First (仅 User Story 1)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (关键 - 阻塞所有故事)
3. 完成 Phase 3: User Story 1
4. **停止并验证**: 独立测试 User Story 1
5. 如就绪则部署/演示 MVP

**预期结果**: 用户可以查看并启用/禁用插件，核心管理功能完整可用

### Incremental Delivery

1. 完成 Setup + Foundational → 基础设施就绪
2. 添加 User Story 1 → 独立测试 → 部署/演示 (MVP!)
3. 添加 User Story 2 → 独立测试 → 部署/演示
4. 添加 User Story 4 → 独立测试 → 部署/演示
5. 添加 User Story 3 → 独立测试 → 部署/演示
6. 执行 Polish → 最终优化

每个增量都添加价值，不破坏之前的功能。

### Parallel Team Strategy

多开发者协作：

1. 团队共同完成 Setup + Foundational
2. Foundational 完成后并行展开：
   - 开发者 A: User Story 1 (P1) - 优先确保 MVP
   - 开发者 B: User Story 2 (P2) - 批量操作
   - 开发者 C: User Story 4 (P2) - 插件市场
3. MVP (US1) 完成后，开发者 A 转向 User Story 3 (P3) 或 Polish
4. 各故事独立完成并集成

---

## Task Summary

| Phase | 任务数 | 说明 |
|-------|--------|------|
| Phase 1: Setup | 6 | 项目结构和目录创建 |
| Phase 2: Foundational | 10 | 核心基础设施，阻塞所有故事 |
| Phase 3: US1 (P1) | 26 | 统一插件管理中心 - MVP |
| Phase 4: US2 (P2) | 20 | 批量插件管理 |
| Phase 5: US4 (P2) | 22 | 插件市场集成 |
| Phase 6: US3 (P3) | 19 | 插件状态可视化 |
| Phase 7: Polish | 11 | 跨故事优化和完善 |
| **总计** | **114** | 完整功能实现 |

### MVP Scope (User Story 1 Only)

- **任务数**: 48 (Setup + Foundational + US1)
- **预期时间**: 核心功能优先交付
- **可独立验证**: 是
- **包含功能**:
  - 统一插件管理界面
  - 查看已安装插件
  - 启用/禁用插件
  - 搜索和过滤插件
  - 基础错误处理

### 并行执行机会

- **Setup 阶段**: 6 个任务全部可并行
- **Foundational 阶段**: 9 个任务可并行
- **每个用户故事内部**: 多个任务可并行
- **跨用户故事**: Foundational 完成后，4 个用户故事可完全并行开发

---

## Notes

- [P] 任务 = 不同文件，无依赖关系
- [Story] 标签 = 将任务映射到具体用户故事，可追溯
- 每个用户故事应独立可完成和测试
- 如包含测试，先验证测试失败再实现
- 每完成一个任务或逻辑组后提交
- 在任何 checkpoint 停止并独立验证故事
- 避免：模糊任务、同文件冲突、破坏独立性的跨故事依赖
