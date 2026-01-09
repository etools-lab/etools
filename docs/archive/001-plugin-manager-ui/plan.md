# Implementation Plan: 集成插件管理界面

**Branch**: `001-plugin-manager-ui` | **Date**: 2025-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-plugin-manager-ui/spec.md`

## Summary

创建统一的插件管理中心界面，整合现有的 `PluginSettingsPanel` 和 `PluginMarketplace` 组件，提供完整的插件生命周期管理功能（浏览、安装、配置、启用/禁用、批量操作、状态监控）。

**Technical Approach**:
- 前端使用 React 19 + TypeScript 创建统一的 `PluginManager` 组件
- 通过标签切换整合"已安装插件"和"插件市场"两个视图
- 使用现有的 Tauri 命令进行插件状态管理
- 实现 React Context 进行插件状态全局管理

## Technical Context

**Language/Version**:
- Frontend: TypeScript 5.8+ with React 19.1.0
- Backend: Rust 1.75+ with Tauri 2.0

**Primary Dependencies**:
- React 19.1.0 (UI 框架)
- Tauri 2.0 (桌面应用框架)
- @tauri-apps/api 2.x (Tauri 前端 API)
- Fuse.js 7.0.0 (模糊搜索)
- date-fns 4.1.0 (日期格式化)

**Storage**:
- 插件配置：SQLite (rusqlite 0.32)
- 插件状态：本地文件系统 + SQLite

**Testing**:
- Unit Tests: Vitest 2.1.8 + @testing-library/react 16.1.0
- E2E Tests: Playwright 1.48.0
- Coverage: @vitest/coverage-v8 2.1.8

**Target Platform**:
- macOS (主要平台)
- Linux, Windows (跨平台支持)

**Project Type**: Tauri 桌面应用 (Single application)

**Performance Goals**:
- 插件列表搜索/过滤响应时间 < 1 秒 (支持 50+ 插件)
- 插件启用/禁用操作响应 < 500ms
- UI 渲染帧率 ≥ 60fps

**Constraints**:
- UI 必须响应式适配不同窗口尺寸
- 批量操作必须有确认对话框
- 所有操作必须有视觉反馈 (< 1 秒)

**Scale/Scope**:
- 支持最多 100 个插件
- 单次批量操作最多 50 个插件
- 插件市场 API 调用频率限制：10 次/分钟

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**项目章程状态**: 当前项目使用的是默认章程模板，尚未定义具体原则。

**检查结果**:
- ✅ 未检测到违反原则的设计决策
- ⚠️ 需要项目团队建立具体的开发章程

**建议原则** (基于现有代码库观察):
1. **组件优先**: UI 功能以独立组件形式实现，便于测试和复用
2. **测试驱动**: 新组件必须包含单元测试
3. **类型安全**: TypeScript strict mode，所有代码必须通过类型检查
4. **用户反馈**: 所有异步操作必须有加载状态和错误处理

---

## Project Structure

### Documentation (this feature)

```text
specs/001-plugin-manager-ui/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── frontend-api.md      # Frontend service contracts
│   └── tauri-commands.md    # Tauri command contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── PluginManager/           # NEW - 统一插件管理中心
│   │   ├── PluginManager.tsx       # 主组件 (标签切换)
│   │   ├── PluginManager.css
│   │   ├── InstalledPluginsView.tsx # 已安装插件视图
│   │   ├── InstalledPluginsView.css
│   │   ├── MarketplaceView.tsx      # 插件市场视图
│   │   ├── MarketplaceView.css
│   │   ├── PluginList.tsx           # 插件列表组件 (支持批量选择)
│   │   ├── PluginList.css
│   │   ├── PluginListItem.tsx       # 单个插件项 (已有，需增强)
│   │   ├── BulkActionsToolbar.tsx   # 批量操作工具栏
│   │   ├── BulkActionsToolbar.css
│   │   ├── PluginDetailPanel.tsx    # 插件详情面板
│   │   └── PluginDetailPanel.css
│   │
│   ├── PluginSettingsPanel.tsx  # EXISTING - 将被重构整合
│   ├── PluginMarketplace.tsx    # EXISTING - 将被重构整合
│   ├── PluginInstaller.tsx      # EXISTING - 复用
│   ├── MarketplacePluginCard.tsx # EXISTING - 复用
│   └── PluginListItem.tsx       # EXISTING - 需增强
│
├── services/
│   ├── pluginLoader.ts          # EXISTING - 插件加载器
│   ├── pluginManager.ts         # NEW - 插件管理服务 (统一 API)
│   ├── pluginStateStore.ts      # NEW - 插件状态 Context
│   └── marketplaceService.ts    # NEW - 插件市场服务
│
├── types/
│   └── plugin.ts                # EXISTING - 插件类型定义 (需扩展)
│
├── hooks/
│   ├── usePluginManager.ts      # NEW - 插件管理 Hook
│   ├── usePluginState.ts        # NEW - 插件状态 Hook
│   └── useBulkSelection.ts      # NEW - 批量选择 Hook
│
└── lib/
    └── plugin-sdk/              # EXISTING - 插件 SDK

src-tauri/
├── src/
│   ├── cmds/
│   │   ├── plugins.rs           # EXISTING - 插件相关命令 (需扩展)
│   │   └── marketplace.rs       # NEW - 插件市场命令
│   ├── services/
│   │   ├── plugin_service.rs    # NEW - 插件业务逻辑服务
│   │   └── marketplace_service.rs # NEW - 插件市场服务
│   └── models/
│       └── plugin.rs            # EXISTING - 插件数据模型 (需扩展)
│
└── assets/
    └── marketplace/             # NEW - 插件市场模拟数据

tests/
├── unit/
│   ├── components/
│   │   ├── PluginManager.test.tsx
│   │   ├── PluginList.test.tsx
│   │   └── BulkActionsToolbar.test.tsx
│   └── services/
│       ├── pluginManager.test.ts
│       └── marketplaceService.test.ts
│
└── integration/
    └── plugin-management.test.ts
```

**Structure Decision**: 采用 Tauri 桌面应用的标准结构：
- **前端 (src/)**: React 组件和服务层，按功能模块组织
- **后端 (src-tauri/)**: Rust 服务和 Tauri 命令，按业务逻辑分离
- **测试 (tests/)**: 单元测试和集成测试分离，与源码目录结构对应

新增的 `PluginManager` 目录作为统一的插件管理中心，整合现有的 `PluginSettingsPanel` 和 `PluginMarketplace` 功能。

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

---

## Phase 0: Research & Technical Decisions

**Objective**: Resolve all technical unknowns and make informed technology choices.

### Research Tasks

1. **插件状态管理策略**
   - 研究 React Context vs Zustand vs Jotai for plugin state management
   - 评估: Tauri 应用中的状态持久化最佳实践

2. **批量操作 UI 模式**
   - 研究: 批量选择的标准交互模式
   - 参考: VSCode 扩展管理器、Chrome 扩展管理页面

3. **插件健康状态检测**
   - 研究: 如何检测插件的运行状态和错误
   - 评估: 心跳机制 vs 错误捕获

4. **虚拟滚动实现**
   - 研究: react-window vs react-virtualized
   - 评估: 插件列表性能优化需求 (50+ 插件)

5. **插件市场数据源**
   - 研究: 使用在线 API vs 本地模拟数据
   - 评估: 开发阶段的数据获取策略

6. **UI 组件库选择**
   - 评估: 是否引入组件库 (shadcn/ui, Radix UI)
   - 决策: 使用现有的自定义组件还是引入新组件库

### Research Output

创建 [research.md](./research.md) 文档，记录：
- 每个研究问题的决策
- 决策理由和替代方案
- 最佳实践参考

---

## Phase 1: Design & Contracts

**Prerequisites**: Phase 0 research.md complete

### 1.1 Data Model

**Output**: [data-model.md](./data-model.md)

定义以下实体的完整数据结构：
- `Plugin` (扩展现有类型)
- `PluginHealth` (健康状态)
- `PluginUsageStats` (使用统计)
- `MarketplacePlugin` (市场插件)
- `BulkOperation` (批量操作)

### 1.2 API Contracts

**Output**: contracts/ 目录

**Frontend Service Contracts** ([contracts/frontend-api.md](./contracts/frontend-api.md)):
- `PluginManagerService`: 插件管理服务接口
- `MarketplaceService`: 插件市场服务接口
- `PluginStateStore`: 插件状态管理接口

**Tauri Command Contracts** ([contracts/tauri-commands.md](./contracts/tauri-commands.md)):
- `plugin_enable` / `plugin_disable`: 启用/禁用插件
- `plugin_batch_enable` / `plugin_batch_disable`: 批量操作
- `plugin_get_health`: 获取插件健康状态
- `marketplace_list`: 获取插件市场列表
- `marketplace_install`: 安装插件

### 1.3 Quick Start Guide

**Output**: [quickstart.md](./quickstart.md)

为开发者提供：
- 开发环境设置
- 本地运行和调试指南
- 测试命令说明
- 代码结构导航

### 1.4 Update Agent Context

运行命令更新 Claude Agent 上下文：
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

---

## Phase 2: Implementation Tasks

**Output**: [tasks.md](./tasks.md) (由 `/speckit.tasks` 命令生成)

基于 Phase 1 的设计文档，生成详细的实现任务列表，按优先级分组：
- P1: 统一插件管理中心 (核心功能)
- P2: 批量操作 + 插件市场集成
- P3: 状态可视化

---

## Progress Tracking

| Phase | Status | Output | Completion |
|-------|--------|--------|------------|
| Phase 0 | ✅ Complete | research.md | 100% |
| Phase 1 | ✅ Complete | data-model.md, contracts/, quickstart.md | 100% |
| Phase 2 | ✅ Complete | tasks.md | 100% |

---

## Notes

- 现有组件 `PluginSettingsPanel` 和 `PluginMarketplace` 将被重构和整合到新的 `PluginManager` 组件中
- 需要保持向后兼容，不破坏现有的插件加载机制
- 所有新增 Tauri 命令需要添加错误处理和日志记录
- UI 设计需要遵循现有的设计系统 (CSS 变量、组件样式)
