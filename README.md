# etools - Productivity Launcher

一个现代化的桌面生产力启动器，使用 Tauri + React + TypeScript 构建。

## 项目特点

- **独立开发**: 所有代码和设计均为原创，使用现代技术栈独立构建
- **开源免费**: 采用 MIT License，欢迎社区贡献
- **跨平台**: 支持 macOS、Windows 和 Linux
- **高性能**: Rust 后端确保毫秒级响应速度

## 功能特性

### 核心功能

- **全局快捷键**: 按 `Option+Space` (macOS) 或 `Alt+Space` (Windows/Linux) 快速打开搜索窗口
- **多源搜索**:
  - 应用程序搜索
  - 文件系统搜索
  - 浏览器书签搜索
  - 剪贴板历史
- **智能快捷操作**:
  - 内置计算器: 直接输入数学表达式 (如 `2+2`, `100*5%`)
  - 颜色转换: 支持颜色格式转换 (Hex, RGB, HSL)
  - 网页搜索快捷前缀 (`g:`, `ddg:`, `gh:`, `so:`)
- **主题系统**: 支持浅色/深色/跟随系统主题
- **插件系统**: 可扩展的插件架构
  - **插件管理器**: 可视化插件管理界面
  - **插件市场**: 浏览和安装社区插件
  - **批量操作**: 批量启用/禁用/卸载插件
  - **健康监控**: 实时监控插件运行状态
  - **多源安装**: 支持本地文件、URL、NPM包等多种安装方式

### 快捷键

#### 全局快捷键
| 快捷键 | 功能 |
|--------|------|
| `Option+Space` / `Alt+Space` | 打开/关闭搜索窗口 |
| `Cmd+Shift+P` | 打开插件管理器 |

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

### 网页搜索前缀

| 前缀 | 搜索引擎 |
|------|----------|
| `g:` | Google |
| `ddg:` | DuckDuckGo |
| `gh:` | GitHub |
| `so:` | Stack Overflow |

## 技术栈

### 前端

- **框架**: React 19
- **语言**: TypeScript 5.8+
- **构建工具**: Vite 7
- **样式**: CSS Modules + Design Tokens
- **搜索**: Fuse.js (模糊搜索)

### 后端

- **框架**: Tauri 2
- **语言**: Rust 1.75+
- **数据库**: SQLite (rusqlite)
  - 文件索引数据库
  - 浏览器缓存数据库
  - 剪贴板历史数据库

### 插件依赖

- `tauri-plugin-global-shortcut`: 全局快捷键
- `tauri-plugin-shell`: Shell 集成
- `tauri-plugin-clipboard-manager`: 剪贴板管理

## 开发

### 前置要求

- Node.js 18+
- Rust 1.75+
- pnpm (推荐) 或 npm

### 安装依赖

```bash
# 安装前端依赖
pnpm install

# 或使用 npm
npm install
```

### 开发模式

```bash
# 启动开发服务器
pnpm tauri dev

# 或使用 npm
npm run tauri dev
```

### 构建生产版本

```bash
# 构建应用
pnpm tauri build

# 或使用 npm
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`

## 项目结构

```
kaka/
├── src/                          # 前端源码
│   ├── components/              # React 组件
│   │   ├── SearchWindow.tsx     # 搜索窗口主组件
│   │   ├── SettingsPanel.tsx    # 设置面板
│   │   ├── HotkeyEditor.tsx     # 快捷键编辑器
│   │   ├── ThemeSelector.tsx    # 主题选择器
│   │   ├── HelpModal.tsx        # 帮助模态框
│   │   ├── PluginManager/       # 插件管理器组件
│   │   │   ├── PluginManager.tsx        # 主管理器入口
│   │   │   ├── InstalledPluginsView.tsx # 已安装插件视图
│   │   │   ├── MarketplaceView.tsx      # 插件市场视图
│   │   │   ├── PluginDetailPanel.tsx    # 插件详情面板
│   │   │   ├── BulkActionsToolbar.tsx   # 批量操作工具栏
│   │   │   ├── InstallDialog.tsx        # 安装对话框
│   │   │   ├── PluginListItem.tsx       # 插件列表项
│   │   │   └── NotificationSystem.tsx   # 通知系统
│   │   └── ui/                  # UI 基础组件
│   ├── hooks/                   # React Hooks
│   │   ├── useSearch.ts         # 搜索逻辑
│   │   ├── useTheme.ts          # 主题管理
│   │   ├── useKeyboardShortcuts.ts  # 键盘快捷键
│   │   ├── useDebounce.ts       # 防抖处理
│   │   └── usePluginState.ts    # 插件状态管理
│   ├── services/                # 服务层
│   │   ├── searchService.ts     # 搜索服务
│   │   ├── actionService.ts     # 快捷操作服务
│   │   ├── pluginManager.ts     # 插件管理服务
│   │   ├── marketplaceService.ts # 插件市场服务
│   │   └── pluginStateStore.ts  # 插件状态存储
│   ├── styles/                  # 样式文件
│   │   ├── design-tokens.css    # 设计变量
│   │   ├── theme-light.css      # 浅色主题
│   │   └── theme-dark.css       # 深色主题
│   └── types/                   # TypeScript 类型定义
│       └── plugin.ts            # 插件类型定义
│
├── src-tauri/                   # Rust 后端
│   ├── src/
│   │   ├── cmds/               # Tauri 命令
│   │   │   ├── plugin_commands.rs  # 插件相关命令
│   │   │   └── marketplace_commands.rs # 市场相关命令
│   │   ├── db/                 # 数据库模块
│   │   ├── models/             # 数据模型
│   │   └── services/           # 后端服务
│   │       ├── clipboard_watcher.rs  # 剪贴板监控
│   │       ├── file_indexer.rs       # 文件索引
│   │       ├── browser_reader.rs     # 浏览器数据读取
│   │       └── plugin_manager.rs     # 插件管理服务
│   ├── Cargo.toml              # Rust 依赖配置
│   └── tauri.conf.json         # Tauri 配置
│
├── specs/                       # 项目规格文档
│   └── 001-productivity-launcher/
│       ├── spec.md             # 功能规格
│       ├── plan.md             # 设计方案
│       └── tasks.md            # 任务列表
│
└── openspec/                    # OpenSpec 工作流
```

## 配置

### 主题设置

应用支持三种主题模式：
- **跟随系统**: 自动切换浅色/深色主题
- **浅色**: 始终使用浅色主题
- **深色**: 始终使用深色主题

主题配置保存在 `localStorage` 中。

### 快捷键设置

可以在设置面板中自定义全局快捷键。

### 搜索配置

- **搜索防抖延迟**: 输入后等待时间 (默认: 150ms)
- **最大结果数**: 显示的最大搜索结果数 (默认: 8)

## 插件管理

### 插件管理器功能

插件管理器提供完整的插件生命周期管理功能：

#### 1. 插件浏览与查看

- **已安装插件视图**: 显示所有已安装的插件列表
  - 按状态筛选（全部、已启用、已禁用、有问题）
  - 按类别筛选（生产力、开发工具、系统工具、娱乐等）
  - 搜索和过滤功能
  - 健康状态指示器（绿色=健康，黄色=警告，红色=错误）

- **插件详情面板**:
  - 插件完整信息（名称、版本、作者、描述）
  - 权限列表和使用状态
  - 健康状态和错误日志
  - 使用统计（使用次数、最后使用时间）
  - 配置参数编辑

#### 2. 插件安装

支持多种安装方式：

- **从插件市场安装**:
  - 浏览社区插件
  - 按类别和评分筛选
  - 一键安装

- **本地文件安装**:
  - 支持选择插件文件夹
  - 自动验证 plugin.toml 配置

- **URL 安装**:
  - 直接输入插件仓库 URL
  - 自动下载和安装

- **NPM 包安装**:
  - 支持 `npm install` 风格的包名
  - 自动解析和安装依赖

#### 3. 批量操作

- **批量启用/禁用**: 选择多个插件进行操作
- **批量卸载**: 同时卸载多个插件
- **操作进度显示**: 实时显示批量操作进度和结果
- **部分失败处理**: 显示成功和失败的插件列表

#### 4. 插件健康监控

- **实时状态检查**:
  - 自动检测插件崩溃
  - 检测资源使用异常
  - 验证插件响应时间

- **健康状态等级**:
  - `healthy`: 插件运行正常
  - `warning`: 插件有问题但仍可运行
  - `error`: 插件出现严重错误
  - `unknown`: 状态未知（新安装或未检查）

#### 5. 插件配置

- **权限管理**:
  - 查看插件请求的权限
  - 授予/撤销权限
  - 文件系统、网络、Shell 等权限类型

- **参数配置**:
  - 编辑插件配置参数
  - 支持多种数据类型（字符串、数字、布尔值）
  - 实时保存

### 插件 API

插件可以访问以下 Tauri 命令：

- `plugin_list`: 列出已安装插件
- `plugin_install`: 安装新插件
- `plugin_enable`: 启用插件
- `plugin_disable`: 禁用插件
- `plugin_uninstall`: 卸载插件
- `plugin_get_health`: 获取插件健康状态
- `plugin_check_health`: 检查插件健康状态
- `plugin_get_usage_stats`: 获取使用统计
- `plugin_bulk_enable`: 批量启用插件
- `plugin_bulk_disable`: 批量禁用插件
- `plugin_bulk_uninstall`: 批量卸载插件
- `plugin_update_config`: 更新插件配置
- `plugin_grant_permission`: 授予权限
- `plugin_revoke_permission`: 撤销权限
- `marketplace_get_plugins`: 获取市场插件列表
- `marketplace_search`: 搜索市场插件
- `marketplace_install`: 安装市场插件

### 插件开发

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
}
```

### 插件 API

插件可以访问以下 Tauri 命令：

- `plugin_list`: 列出已安装插件
- `plugin_install`: 安装新插件
- `plugin_enable`: 启用插件
- `plugin_disable`: 禁用插件
- `plugin_uninstall`: 卸载插件

## 常见问题

### macOS 透明窗口

在 macOS 上，透明窗口需要启用私有 API。已在 `tauri.conf.json` 中配置：

```json
{
  "macOSPrivateApi": true
}
```

### 文件索引排除目录

默认排除以下目录：
- `node_modules`
- `.git`
- `target`
- `dist`
- `build`
- `.cache`

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [React](https://react.dev/) - UI 框架
- [Fuse.js](https://fusejs.io/) - 模糊搜索库

## 开源信息

- **许可证**: MIT License - 详见 [LICENSE](./LICENSE)
- **资源管理**: 详见 [ASSETS.md](./ASSETS.md)
- **第三方声明**: 详见 [NOTICES.md](./NOTICES.md)
- **知识产权管理**: 详见 [LEGAL-RISK-ASSESSMENT.md](./LEGAL-RISK-ASSESSMENT.md)
