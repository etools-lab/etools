# etools - Productivity Launcher

<div align="center">

**一个现代化的桌面生产力启动器**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

[English](./README_EN.md) | 简体中文

</div>

---

##  项目概述

etools 是一个类似 uTools 的桌面生产力启动器，通过全局快捷键快速唤醒，提供应用程序搜索、文件系统搜索、浏览器书签、剪贴板历史等功能。内置可扩展的插件系统，支持自定义功能扩展。

### 核心特性

- **跨平台支持** - macOS、Windows、Linux
- **毫秒级响应** - Rust 后端 + Fuse.js 模糊搜索
- **可扩展架构** - 完整的插件系统和插件管理器
- **原生体验** - 透明窗口、全局快捷键、系统托盘
- **主题系统** - 浅色/深色/跟随系统主题

---

## 功能特性

### 核心功能

#### 全局快捷键
- `Option+Space` (macOS) / `Alt+Space` (Windows/Linux) - 快速打开搜索窗口
- `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux) - 打开插件管理器

#### 多源搜索
- **应用程序搜索** - 快速启动已安装的应用
- **文件系统搜索** - 基于文件索引的快速文件查找
- **浏览器书签** - 支持主流浏览器书签搜索
- **剪贴板历史** - 历史剪贴板内容快速访问

#### 智能快捷操作
- **内置计算器** - 直接输入数学表达式（如 `2+2`、`100*5%`）
- **颜色转换** - 支持 Hex、RGB、HSL 格式转换
- **网页搜索** - 快捷前缀搜索（`g:` Google、`ddg:` DuckDuckGo、`gh:` GitHub、`so:` Stack Overflow）

### 插件系统

#### 插件管理器
完整的可视化插件管理界面：

- **已安装插件视图**
  - 状态筛选（全部、已启用、已禁用、有问题）
  - 类别筛选（生产力、开发工具、系统工具等）
  - 健康状态指示器（绿色/黄色/红色）
  - 使用统计（使用次数、最后使用时间）

- **插件详情面板**
  - 完整插件信息（名称、版本、作者、描述）
  - 权限列表和状态
  - 健康状态和错误日志
  - 配置参数编辑

- **插件市场**
  - 浏览社区插件
  - 按类别和评分筛选
  - 一键安装

- **批量操作**
  - 批量启用/禁用插件
  - 批量卸载插件
  - 实时进度显示

- **多源安装**
  - 本地文件夹安装
  - URL 远程安装
  - NPM 包安装

#### 内置插件

- `hello-world` - 示例插件
- `qrcode` - 二维码生成器
- `json-formatter` - JSON 格式化工具
- `timestamp` - 时间戳转换
- `regex-tester` - 正则表达式测试
- `sandbox-demo` - 沙箱环境演示

### 快捷键

#### 搜索窗口
| 快捷键 | 功能 |
|--------|------|
| `Esc` | 关闭窗口/清空输入 |
| `↑` / `↓` | 在结果中导航 |
| `Enter` | 执行选中项 |
| `Tab` | 切换搜索类型 |
| `Cmd+C` | 复制选中内容 |
| `Cmd+V` | 粘贴剪贴板历史 |
| `Cmd+Shift+V` | 打开剪贴板管理器 |

#### 插件管理器
| 快捷键 | 功能 |
|--------|------|
| `Cmd+A` | 全选插件 |
| `Cmd+/` | 聚焦搜索框 |
| `Esc` | 清除选择/退出详情面板 |
| `Cmd+Shift+A` | 切换批量选择模式 |

---

## 技术栈

### 前端
- **框架** - React 19
- **语言** - TypeScript 5.8+
- **构建工具** - Vite 7
- **样式** - CSS Modules + Design Tokens
- **状态管理** - Zustand
- **模糊搜索** - Fuse.js 7.0

### 后端
- **框架** - Tauri 2.0
- **语言** - Rust 1.75+
- **数据库** - SQLite (rusqlite 0.32)
  - 文件索引数据库
  - 浏览器缓存数据库
  - 剪贴板历史数据库
  - 插件状态存储
- **异步运行时** - Tokio

### Tauri 插件
- `tauri-plugin-global-shortcut` - 全局快捷键
- `tauri-plugin-shell` - Shell 集成
- `tauri-plugin-clipboard-manager` - 剪贴板管理

---

## 快速开始

### 前置要求

- Node.js 18+
- Rust 1.75+
- pnpm（推荐）或 npm

### 安装依赖

```bash
# 安装前端依赖
pnpm install
```

### 开发模式

```bash
# 启动开发服务器（前端 + Tauri 后端）
pnpm tauri dev

# 仅启动前端开发服务器
pnpm dev
```

### 构建生产版本

```bash
# 构建应用
pnpm tauri build

# 仅构建前端
pnpm build
```

构建产物位于 `src-tauri/target/release/bundle/`

---

## 项目结构

```
etools/
├── src/                          # 前端源码 (144 文件, ~20,000 行)
│   ├── components/               # React 组件 (~8,000 行)
│   │   ├── SearchWindow.tsx      # 主搜索窗口 (640x400)
│   │   ├── SettingsPanel.tsx     # 设置面板 (700x600)
│   │   ├── PluginManager/        # 插件管理器组件群
│   │   │   ├── PluginManager.tsx         # 主管理器入口
│   │   │   ├── InstalledPluginsView.tsx  # 已安装插件视图
│   │   │   ├── MarketplaceView.tsx       # 插件市场视图
│   │   │   ├── PluginDetailPanel.tsx     # 插件详情面板
│   │   │   ├── BulkActionsToolbar.tsx    # 批量操作工具栏
│   │   │   └── NotificationSystem.tsx    # 通知系统
│   │   └── ui/                  # UI 基础组件库
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Badge.tsx
│   │       ├── Spinner.tsx
│   │       └── Kbd.tsx
│   ├── hooks/                   # 自定义 React Hooks (11 个)
│   │   ├── useSearch.ts         # 搜索逻辑 (防抖 + Fuse.js)
│   │   ├── useTheme.ts          # 主题管理
│   │   ├── useKeyboardShortcuts.ts  # 键盘快捷键
│   │   ├── usePluginState.ts    # 插件状态管理
│   │   └── useBulkSelection.ts  # 批量选择功能
│   ├── services/                # 业务逻辑服务层 (~4,300 行)
│   │   ├── searchService.ts     # 搜索服务
│   │   ├── actionService.ts     # 快捷操作服务
│   │   ├── pluginManager.ts     # 插件管理服务
│   │   ├── pluginStateStore.ts  # 插件状态存储 (Zustand)
│   │   ├── marketplaceService.ts # 插件市场服务
│   │   └── errorLogger.ts       # 错误日志服务
│   ├── lib/                     # 工具库
│   │   └── plugins/             # 内置插件
│   │       ├── hello-world/
│   │       ├── qrcode/
│   │       ├── json-formatter/
│   │       ├── timestamp/
│   │       ├── regex-tester/
│   │       └── sandbox-demo/
│   ├── styles/                  # 样式文件 (57 个文件)
│   │   ├── design-tokens.css    # 设计变量
│   │   ├── theme-light.css      # 浅色主题
│   │   └── theme-dark.css       # 深色主题
│   ├── types/                   # TypeScript 类型定义
│   │   ├── plugin.ts
│   │   ├── search.ts
│   │   └── clipboard.ts
│   ├── App.tsx                  # 应用入口
│   └── main.tsx                 # React 挂载点
│
├── src-tauri/                   # Rust 后端 (38 文件, ~12,000 行)
│   ├── src/
│   │   ├── cmds/               # Tauri 命令处理器 (~3,800 行)
│   │   │   ├── app.rs          # 应用程序发现、启动、图标
│   │   │   ├── search.rs       # 文件搜索、索引、浏览器数据
│   │   │   ├── clipboard.rs    # 剪贴板历史管理
│   │   │   ├── plugins.rs      # 插件生命周期管理
│   │   │   ├── marketplace.rs  # 插件市场功能
│   │   │   ├── settings.rs     # 用户设置管理
│   │   │   ├── window.rs       # 窗口状态管理
│   │   │   ├── shell.rs        # Shell 操作
│   │   │   ├── abbreviation.rs # 缩写词管理
│   │   │   ├── performance.rs  # 性能监控
│   │   │   └── mod.rs          # 模块导出
│   │   ├── services/           # 业务服务层 (~5,200 行)
│   │   │   ├── app_monitor.rs         # 应用程序监控
│   │   │   ├── file_indexer.rs        # 文件系统索引 (notify 监控)
│   │   │   ├── browser_reader.rs      # 浏览器数据读取
│   │   │   ├── clipboard_watcher.rs   # 剪贴板监控
│   │   │   ├── plugin_sandbox.rs      # 插件沙箱环境
│   │   │   ├── plugin_service.rs      # 插件管理核心
│   │   │   ├── marketplace_service.rs # 插件市场服务
│   │   │   └── performance.rs         # 性能监控服务
│   │   ├── db/                 # 数据库层
│   │   │   ├── files.rs        # 文件索引数据库
│   │   │   └── browser.rs      # 浏览器缓存数据库
│   │   ├── models/             # 数据模型
│   │   │   ├── plugin.rs       # 插件数据模型
│   │   │   ├── app.rs          # 应用程序数据模型
│   │   │   ├── clipboard.rs    # 剪贴板数据模型
│   │   │   └── preferences.rs  # 用户偏好设置
│   │   ├── lib.rs              # Tauri 入口 (命令注册)
│   │   └── error.rs            # 错误处理
│   ├── Cargo.toml              # Rust 依赖配置
│   └── tauri.conf.json         # Tauri 配置 (窗口、权限、构建)
│
├── example-plugins/            # 示例插件
├── e2e/                        # E2E 测试 (Playwright)
├── specs/                      # 项目规格文档
│   └── 001-productivity-launcher/
│       ├── spec.md             # 功能规格
│       ├── plan.md             # 设计方案
│       └── tasks.md            # 任务列表
│
├── package.json                # 前端依赖配置
├── vite.config.ts              # Vite 构建配置 (代码分割)
├── tsconfig.json               # TypeScript 配置
├── CLAUDE.md                   # Claude Code 项目指南
├── CONTRIBUTING.md             # 贡献指南
├── CODEOWNERS                  # 代码所有者
├── SECURITY.md                 # 安全策略
└── README.md                   # 本文件
```

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Components │  │    Hooks     │  │   Services   │      │
│  │  (~8,000 行) │  │   (11 hooks) │  │  (~4,300 行) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────┬───────────────────────────────┘
                              │ Tauri IPC
                              │ invoke / events
┌─────────────────────────────┴───────────────────────────────┐
│                      Backend (Rust/Tauri)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Commands   │  │   Services   │  │  DB / Models │      │
│  │  (~3,800 行) │  │  (~5,200 行) │  │   (SQLite)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 窗口架构

应用包含以下窗口：

- **main** - 主搜索窗口 (640x400)
  - 透明、无边框、置顶
  - 居中显示在主显示器

- **settings** - 设置面板 (700x600)
  - 主题设置、快捷键设置

- **plugin-popup** - 插件自定义 UI 弹窗 (480x400)
  - 插件专用界面

---

## 配置说明

### 主题设置

应用支持三种主题模式：
- **跟随系统** - 自动切换浅色/深色主题
- **浅色** - 始终使用浅色主题
- **深色** - 始终使用深色主题

主题配置保存在 `localStorage` 中。

### 搜索配置

- **搜索防抖延迟** - 输入后等待时间（默认: 150ms）
- **最大结果数** - 显示的最大搜索结果数（默认: 8）

### 文件索引排除目录

默认排除以下目录：
- `node_modules`
- `.git`
- `target`
- `dist`
- `build`
- `.cache`

---

## 插件开发

### 插件 API

#### Tauri 命令

插件可以访问以下 Tauri 命令：

```typescript
// 插件生命周期管理
invoke('plugin_list')
invoke('plugin_install', { source, options })
invoke('plugin_enable', { pluginId })
invoke('plugin_disable', { pluginId })
invoke('plugin_uninstall', { pluginId })

// 健康监控
invoke('plugin_get_health', { pluginId })
invoke('plugin_check_health', { pluginId })
invoke('plugin_get_usage_stats', { pluginId })

// 批量操作
invoke('plugin_bulk_enable', { pluginIds })
invoke('plugin_bulk_disable', { pluginIds })
invoke('plugin_bulk_uninstall', { pluginIds })

// 配置管理
invoke('plugin_update_config', { pluginId, config })
invoke('plugin_grant_permission', { pluginId, permission })
invoke('plugin_revoke_permission', { pluginId, permission })

// 插件市场
invoke('marketplace_get_plugins')
invoke('marketplace_search', { query })
invoke('marketplace_install', { pluginId })
```

#### 插件类型定义

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
  enabled: boolean;
  healthStatus: 'healthy' | 'warning' | 'error' | 'unknown';
}

interface PluginSearchResult {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  action: () => void | Promise<void>;
}
```

### 创建插件

1. 在 `src/lib/plugins/` 或 `example-plugins/` 创建插件目录
2. 实现 `index.ts` 导出 `manifest` 和 `search` 函数
3. 可选：实现 `ui.tsx` 自定义 UI 组件

#### 示例插件

```typescript
// src/lib/plugins/my-plugin/index.ts
import { Plugin, PluginSearchResult } from '@/types/plugin';

export const manifest: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
  author: 'Your Name',
  permissions: [],
  triggers: ['my'],
  settings: [],
  enabled: true,
  healthStatus: 'unknown',
};

export async function search(query: string): Promise<PluginSearchResult[]> {
  if (!query.startsWith('my ')) return [];

  return [{
    id: 'my-result',
    title: 'My Result',
    description: 'Click me!',
    action: () => {
      console.log('Action executed!');
    },
  }];
}
```

---

## 常见问题

### macOS 透明窗口

在 macOS 上，透明窗口需要启用私有 API。已在 `tauri.conf.json` 中配置：

```json
{
  "macOSPrivateApi": true
}
```

### 开发调试

#### 前端调试
- 开发模式下自动打开浏览器 DevTools
- 使用 `write_debug_log` 命令输出日志

#### 后端调试
- 使用 `println!` 或 `log::info!` 输出到终端
- 检查 `src-tauri/target/debug/` 中的日志

#### Tauri IPC 调试
- 在 `lib.rs` 的 `invoke_handler` 中添加日志
- 使用 Tauri DevTools 监控 IPC 调用

---

## 测试

### 单元测试

```bash
# 运行单元测试 (Vitest)
pnpm test

# 运行测试并打开 UI 界面
pnpm test:ui

# 生成测试覆盖率报告
pnpm test:coverage
```

### E2E 测试

```bash
# 运行 E2E 测试 (Playwright)
pnpm test:e2e

# 运行 E2E 测试并打开 UI 界面
pnpm test:e2e:ui
```

### Rust 测试

```bash
# 在 src-tauri 目录下运行
cargo test
```

### 代码检查

```bash
# 前端代码检查
pnpm lint

# Rust 代码检查
cd src-tauri && cargo clippy
```

---

## 开源信息

- **许可证** - [MIT License](./LICENSE)
- **资源管理** - 详见 [ASSETS.md](./ASSETS.md)
- **第三方声明** - 详见 [NOTICES.md](./NOTICES.md)
- **知识产权管理** - 详见 [LEGAL-RISK-ASSESSMENT.md](./LEGAL-RISK-ASSESSMENT.md)

---

## 贡献

欢迎提交 Issue 和 Pull Request！详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 致谢

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [React](https://react.dev/) - UI 框架
- [Fuse.js](https://fusejs.io/) - 模糊搜索库
- [Vite](https://vitejs.dev/) - 构建工具

---

<div align="center">

**Made with ❤️ by [Chee-0806](https://github.com/Chee-0806)**

[⬆ 返回顶部](#etools---productivity-launcher)

</div>
