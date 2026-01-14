# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

etools 是一个基于 Tauri + React + TypeScript 构建的桌面生产力启动器。它通过全局快捷键快速打开搜索窗口，支持应用程序搜索、文件系统搜索、浏览器书签搜索、剪贴板历史等功能。

## 常用命令

### 开发与构建

```bash
# 启动开发服务器（前端 + Tauri 后端）
pnpm tauri dev

# 仅启动前端开发服务器
pnpm dev

# 构建生产版本
pnpm tauri build

# 仅构建前端
pnpm build
```

### 测试

```bash
# 单元测试（Vitest）
pnpm test                    # 运行所有单元测试
pnpm test:ui                 # 运行测试并打开 UI 界面
pnpm test:coverage           # 生成测试覆盖率报告

# E2E 测试（Playwright）
pnpm test:e2e                # 运行 E2E 测试
pnpm test:e2e:ui             # 运行 E2E 测试并打开 UI 界面

# 运行所有测试
pnpm test:all
```

### Rust 后端

```bash
# 在 src-tauri 目录下运行
cargo test                   # 运行 Rust 单元测试
cargo clippy                 # 代码检查
cargo fmt                    # 代码格式化
```

### 单个测试运行

```bash
# 运行单个测试文件
pnpm test <file-name>

# 运行匹配模式的测试
pnpm test -- <pattern>
```

## 代码架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Components │  │    Hooks     │  │   Services   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────┬───────────────────────────────┘
                              │ Tauri IPC
                              │ invoke / events
┌─────────────────────────────┴───────────────────────────────┐
│                      Backend (Rust/Tauri)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Commands   │  │   Services   │  │  DB / Models │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 前端架构（src/）

**组件层 (components/)**
- `SearchWindow.tsx` - 主搜索窗口组件
- `SettingsPanel.tsx` - 设置面板
- `PluginManager/` - 插件管理器组件群
  - `PluginManager.tsx` - 主管理器入口
  - `InstalledPluginsView.tsx` - 已安装插件视图
  - `MarketplaceView.tsx` - 插件市场视图
  - `PluginDetailPanel.tsx` - 插件详情面板
  - `BulkActionsToolbar.tsx` - 批量操作工具栏
  - `NotificationSystem.tsx` - 通知系统
- `ui/` - 可复用 UI 基础组件（Button, Input, Badge, Spinner, Kbd 等）

**服务层 (services/)**
- `searchService.ts` - 搜索服务，统一处理各种搜索源
- `actionService.ts` - 快捷操作服务（计算器、颜色转换、网页搜索）
- `pluginManager.ts` - 插件管理服务
- `pluginStateStore.ts` - 插件状态存储（基于 Zustand）
- `marketplaceService.ts` - 插件市场服务
- `errorLogger.ts` - 全局错误日志服务

**Hooks (hooks/)**
- `useSearch.ts` - 搜索逻辑 Hook（防抖、Fuse.js 模糊搜索）
- `useTheme.ts` - 主题管理 Hook（支持跟随系统）
- `useKeyboardShortcuts.ts` - 键盘快捷键处理
- `usePluginState.ts` - 插件状态管理
- `useBulkSelection.ts` - 批量选择功能

**类型定义 (types/)**
- `plugin.ts` - 插件相关类型定义
- `search.ts` - 搜索结果类型定义
- `clipboard.ts` - 剪贴板相关类型

### 后端架构（src-tauri/src/）

**命令层 (cmds/)**
每个文件对应一类 Tauri 命令，通过 `invoke_handler` 暴露给前端：

- `app.rs` - 应用程序发现、启动、图标获取
- `search.rs` - 文件搜索、文件索引、浏览器数据搜索
- `clipboard.rs` - 剪贴板历史管理
- `plugins.rs` - 插件生命周期管理（安装、启用、禁用、卸载）
- `marketplace.rs` - 插件市场功能
- `settings.rs` - 用户设置管理
- `window.rs` - 窗口状态管理
- `shell.rs` - Shell 操作（打开 URL 等）
- `abbreviation.rs` - 缩写词管理
- `performance.rs` - 性能监控

**服务层 (services/)**
- `app_monitor.rs` - 监控已安装应用程序
- `file_indexer.rs` - 文件系统索引服务（使用 notify 监控文件变化）
- `browser_reader.rs` - 浏览器数据读取（书签、历史）
- `clipboard_watcher.rs` - 剪贴板监控服务
- `plugin_sandbox.rs` - 插件沙箱环境
- `plugin_service.rs` - 插件管理核心逻辑
- `marketplace_service.rs` - 插件市场服务
- `performance.rs` - 性能监控服务

**数据库层 (db/)**
使用 SQLite 存储：
- `files.rs` - 文件索引数据库
- `browser.rs` - 浏览器缓存数据库

**数据模型 (models/)**
- `plugin.rs` - 插件数据模型
- `app.rs` - 应用程序数据模型
- `clipboard.rs` - 剪贴板数据模型
- `preferences.rs` - 用户偏好设置

### 插件系统

etools 作为一个干净的容器，不包含任何内置插件。所有插件都需要用户手动安装。

**插件安装位置**
- 插件安装在用户数据目录的 `plugins/` 文件夹中
- 通过插件管理器或命令行安装

**插件结构**
每个插件包含：
- `index.ts` - 插件入口，导出 `manifest` 和 `search` 函数
- `ui.tsx` - 可选的自定义 UI 组件

**插件 API**
```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: PluginPermission[];
  triggers: string[];
  settings: PluginSetting[];
}

interface PluginSearchResult {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  action: () => void | Promise<void>;
}
```

**插件加载**
前端通过 `pluginLoader.ts` 动态加载插件，后端通过 `plugin_service.rs` 管理插件生命周期。

## 关键技术决策

### 搜索架构
- 使用 Fuse.js 进行前端模糊搜索
- 文件索引由 Rust 后端维护（SQLite + notify 文件监控）
- 浏览器数据定期缓存到 SQLite（避免频繁读取浏览器文件）

### 状态管理
- 主题设置：`localStorage`
- 插件状态：Zustand store (`pluginStateStore.ts`)
- Tauri 状态：通过 `app.manage()` 管理全局状态

### 窗口管理
- 主窗口 (`main`)：搜索窗口，固定高度 80px，透明无边框
- 结果窗口 (`results`)：搜索结果展示，动态高度 200-600px
- 设置窗口 (`settings`)：设置面板，700x600px
- 插件弹窗 (`plugin-popup`)：插件自定义 UI 弹窗，480x400px
- 所有窗口使用透明效果和无边框设计（macOS 需要私有 API）
- 窗口状态持久化：`windowState` 保存位置和大小

### 主题系统
- 支持：浅色、深色、跟随系统
- 使用 CSS Variables (Design Tokens)
- 主题切换通过 `data-theme` 属性

### 性能优化
- 搜索防抖（150ms）
- 文件索引增量更新
- 插件延迟加载（React.lazy）
- 性能监控 (`services/performance.rs`)
- 代码分割（Vite）：React、Tauri API、UI 组件、Services、Hooks、Plugin SDK 分别打包

## 重要约定

### Tauri 命令命名
- 后端命令使用 snake_case：`get_installed_apps`
- 前端调用时保持一致：`invoke('get_installed_apps')`

### 错误处理
- 前端：全局 ErrorBoundary (`components/ErrorBoundary.tsx`)
- 后端：使用 `Result<T, E>` 返回错误
- 错误日志：`services/errorLogger.ts`

### 测试约定
- 单元测试文件：`.test.ts` 或 `.test.tsx`
- 测试文件与源文件同目录
- E2E 测试位于 `e2e/` 目录
- 覆盖率阈值：行 70%、函数 70%、分支 60%、语句 70%

### 文件索引排除目录
默认排除：`node_modules`, `.git`, `target`, `dist`, `build`, `.cache`

### macOS 特殊配置
- 透明窗口需要启用私有 API：`tauri.conf.json` 中 `macOSPrivateApi: true`

### Tauri 应用架构原则（核心）

**职责分工：**
- **Rust 后端 (Tauri)**：负责所有桌面软件功能
  - 窗口管理（创建、显示、隐藏、关闭）
  - 全局快捷键、系统托盘
  - 文件系统访问、系统调用
  - 与操作系统的交互
- **前端 (React)**：仅负责 UI 渲染和用户交互
  - 组件渲染
  - 用户输入处理
  - 通过 `invoke()` 调用后端命令

**关键规则：**
1. **窗口管理必须用 Tauri**：不要在前端使用 `@tauri-apps/api/window` 管理窗口，应该在 Rust 后端通过 `app.get_webview_window(label)` 操作
2. **桌面功能优先考虑 Tauri 原生 API**：全局快捷键、系统托盘、通知等都应该在 Rust 实现
3. **前端只负责 UI**：不要让前端承担系统级功能的职责

**错误示例：**
```typescript
// ❌ 在前端管理窗口和快捷键
import { getCurrentWindow } from '@tauri-apps/api/window';
import { register } from '@tauri-apps/plugin-global-shortcut';

const window = getCurrentWindow();
await register('Cmd+Shift+K', () => {
  window.show(); // 职责混乱
});
```

**正确示例：**
```rust
// ✅ 在 Rust 后端管理窗口和快捷键
let window = app.get_webview_window("main").unwrap();
app.global_shortcut().on_shortcut(shortcut, move |_, _, _| {
    let _ = window.show();
})?;
```

## 开发工作流

1. **添加新功能**
   - 前端：在 `components/` 添加组件，`services/` 添加服务逻辑
   - 后端：在 `cmds/` 添加命令处理器，`services/` 添加业务逻辑
   - 在 `src-tauri/src/lib.rs` 注册新命令
   - 在 `src-tauri/src/cmds/mod.rs` 导出命令模块

2. **添加新插件**
   - 在 `src/lib/plugins/` 或 `example-plugins/` 创建插件目录
   - 实现 `manifest` 和 `search` 导出
   - 前端自动发现并加载

3. **修改主题**
   - 修改 `src/styles/design-tokens.css`（设计变量）
   - 修改 `src/styles/theme-light.css` 或 `theme-dark.css`

4. **数据库迁移**
   - 直接在 `db/` 模块中修改表结构
   - SQLite 位于应用数据目录

5. **添加新窗口**
   - 在 `src-tauri/tauri.conf.json` 的 `app.windows` 数组中添加窗口配置
   - 在 `src/components/` 创建对应的 React 组件
   - 在 `src/App.tsx` 中注册新窗口组件
   - 在 Rust 后端使用 `app.get_webview_window(label)` 控制窗口

## 调试技巧

### 前端调试
- 开发模式下自动打开浏览器 DevTools
- 使用 `write_debug_log` 命令输出日志

### 后端调试
- 使用 `println!` 或 `log::info!` 输出到终端
- 检查 `src-tauri/target/debug/` 中的日志

### Tauri IPC 调试
- 在 `lib.rs` 的 `invoke_handler` 中添加日志
- 使用 Tauri DevTools 监控 IPC 调用

## 相关文档

- README.md - 项目概述和功能说明
- specs/001-productivity-launcher/ - 功能规格和设计方案
- specs/001-plugin-manager-ui/ - 插件管理器规格和设计
- src-tauri/tauri.conf.json - Tauri 配置（窗口、安全、构建设置）
- vite.config.ts - Vite 构建配置（代码分割、开发服务器）
- tsconfig.json - TypeScript 配置（路径别名 @/ 指向 ./src）

## Active Technologies
- Rust 1.75+, TypeScript 5.8+ + Tauri 2.0, React 19, SQLite (rusqlite 0.32), Fuse.js 7.0 (001-plugin-management)
- SQLite 数据库存储插件状态和配置，文件系统存储插件文件 (001-plugin-management)

## Recent Changes
- **架构调整**：遵循 Tauri 应用架构原则，将窗口管理和全局快捷键从前端移至 Rust 后端，明确职责分工
- 001-plugin-management: Added Rust 1.75+, TypeScript 5.8+ + Tauri 2.0, React 19, SQLite (rusqlite 0.32), Fuse.js 7.0
