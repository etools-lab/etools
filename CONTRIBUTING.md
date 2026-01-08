# 贡献指南

感谢你有兴趣为 etools 做出贡献！我们欢迎所有形式的贡献。

<div align="center">

**📋 目录**

[行为准则](#-行为准则) • [如何贡献](#-如何贡献) • [开发流程](#-开发流程) • [代码规范](#-代码规范) • [提交规范](#-提交规范) • [Pull Request](#-pull-request)

</div>

---

## 🤝 行为准则

参与本项目即表示你同意遵守我们的行为准则：

- 尊重不同的观点和经验
- 使用欢迎和包容的语言
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

---

## 🚀 如何贡献

### 报告 Bug

1. 检查 [Issues](https://github.com/Chee-0806/etools/issues) 确认问题未被报告
2. 使用 **Bug Report** 模板创建 Issue
3. 提供以下信息：
   - 详细的重现步骤
   - 预期行为 vs 实际行为
   - 环境信息（OS、应用版本、架构）
   - 相关的错误日志或截图

### 提出新功能

1. 先检查是否有类似的 Feature Request
2. 使用 **Feature Request** 模板创建 Issue
3. 说明以下内容：
   - 功能描述和用例
   - 预期行为
   - 考虑过的替代方案
   - 其他相关信息

### 提交代码

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个 Pull Request

---

## 💻 开发流程

### 环境准备

#### 前置要求

- **Node.js** 18+
- **Rust** 1.75+
- **pnpm**（推荐）或 npm

#### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/Chee-0806/etools.git
cd etools

# 2. 安装前端依赖
pnpm install

# 3. 启动开发服务器
pnpm tauri dev
```

### 开发命令

#### 启动开发服务器

```bash
# 完整开发环境（前端 + Tauri 后端）
pnpm tauri dev

# 仅启动前端开发服务器
pnpm dev

# 仅启动后端（在 src-tauri 目录下）
cd src-tauri && cargo run
```

#### 构建生产版本

```bash
# 构建完整应用
pnpm tauri build

# 仅构建前端
pnpm build
```

构建产物位于 `src-tauri/target/release/bundle/`

#### 测试

```bash
# 单元测试 (Vitest)
pnpm test                    # 运行所有单元测试
pnpm test:ui                 # 运行测试并打开 UI 界面
pnpm test:coverage           # 生成测试覆盖率报告

# E2E 测试 (Playwright)
pnpm test:e2e                # 运行 E2E 测试
pnpm test:e2e:ui             # 运行 E2E 测试并打开 UI 界面

# 运行所有测试
pnpm test:all

# Rust 测试（在 src-tauri 目录下）
cd src-tauri && cargo test
```

#### 代码检查

```bash
# 前端代码检查
pnpm lint                    # ESLint 检查
pnpm lint:fix                # 自动修复问题

# Rust 代码检查
cd src-tauri && cargo clippy # 代码检查
cd src-tauri && cargo fmt    # 代码格式化
```

### 项目结构

```
etools/
├── src/                    # 前端源码 (React + TypeScript)
│   ├── components/         # React 组件
│   │   ├── SearchWindow.tsx    # 主搜索窗口
│   │   ├── SettingsPanel.tsx   # 设置面板
│   │   ├── PluginManager/      # 插件管理器组件群
│   │   └── ui/                 # 可复用 UI 组件
│   ├── hooks/             # 自定义 React Hooks
│   ├── services/          # 业务逻辑服务层
│   ├── lib/               # 工具库和插件
│   ├── styles/            # 样式文件
│   └── types/             # TypeScript 类型定义
│
├── src-tauri/             # 后端源码 (Rust)
│   ├── src/
│   │   ├── cmds/         # Tauri 命令处理器
│   │   ├── services/     # 业务服务层
│   │   ├── db/           # 数据库层
│   │   ├── models/       # 数据模型
│   │   └── lib.rs        # Tauri 入口（命令注册）
│   ├── Cargo.toml        # Rust 依赖配置
│   └── tauri.conf.json   # Tauri 配置
│
├── example-plugins/       # 示例插件
├── e2e/                   # E2E 测试
└── specs/                 # 项目规格文档
```

---

## 📐 代码规范

### TypeScript/React

#### 基本规范

- 使用 **函数组件** 和 **Hooks**
- 遵循 ESLint 配置
- 组件使用 **PascalCase** 命名
- 函数使用 **camelCase** 命名
- 添加适当的类型注解

#### 组件示例

```tsx
// ✅ 好的示例
interface ButtonProps {
  title: string;
  onClick: () => void;
  disabled?: boolean;
}

export function MyButton({ title, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {title}
    </button>
  );
}

// ❌ 避免的示例
// - 使用 any 类型
// - 缺少 props 接口定义
// - 不必要的默认 props（使用参数默认值代替）
```

#### Hooks 使用

```tsx
// ✅ 好的示例
export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const debouncedSearch = debounce(async () => {
      setLoading(true);
      const data = await searchService.search(query);
      setResults(data);
      setLoading(false);
    }, 150);

    debouncedSearch();

    return () => {
      debouncedSearch.cancel();
    };
  }, [query]);

  return { results, loading };
}
```

#### 导入顺序

```tsx
// 1. React 相关
import { useState, useEffect } from 'react';

// 2. 第三方库
import { invoke } from '@tauri-apps/api/core';
import Fuse from 'fuse.js';

// 3. 内部组件
import { Button } from '@/components/ui/Button';

// 4. 内部服务
import { searchService } from '@/services/searchService';

// 5. 类型定义
import type { Plugin } from '@/types/plugin';

// 6. 样式文件
import './SearchWindow.css';
```

### Rust

#### 基本规范

- 使用 **snake_case** 命名函数和变量
- 使用 **PascalCase** 命名类型和结构体
- 添加适当的文档注释（`///`）
- 使用 `Result<T, E>` 进行错误处理

#### 命令示例

```rust
// ✅ 好的示例
use serde::{Deserialize, Serialize};

/// 获取已安装的应用程序
///
/// # Arguments
///
/// * `refresh` - 是否刷新缓存
///
/// # Returns
///
/// 返回应用列表和扫描耗时
///
/// # Errors
///
/// 当无法访问应用程序目录时返回错误
#[tauri::command]
pub async fn get_installed_apps(refresh: bool) -> Result<Vec<App>, String> {
    let apps = app_service::get_apps(refresh).await?;
    Ok(apps)
}

// ❌ 避免的示例
// - 缺少文档注释
// - 使用 `.unwrap()` 而不是 `?` 操作符
// - 不必要的 `clone()`（可以使用引用）
```

#### 错误处理

```rust
// ✅ 好的示例
use crate::error::AppError;

pub async fn load_plugins() -> Result<Vec<Plugin>, AppError> {
    let plugins_dir = get_plugins_dir()?;
    let entries = fs::read_dir(plugins_dir).await?;

    let mut plugins = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| AppError::IoError(e.to_string()))?;
        // 处理插件...
    }

    Ok(plugins)
}
```

---

## 📝 提交规范

我们使用 [约定式提交](https://www.conventionalcommits.org/zh-hans/) 规范：

### 格式

```
<类型>[可选 范围]: <描述>

[可选 正文]

[可选 脚注]
```

### 类型 (Type)

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响代码运行） |
| `refactor` | 重构（既不是新功能也不是修复） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建过程或辅助工具的变动 |
| `ci` | CI 配置文件和脚本的变动 |

### 范围 (Scope)

常用的范围包括：
- `search` - 搜索相关
- `plugin` - 插件相关
- `ui` - UI 组件
- `window` - 窗口管理
- `clipboard` - 剪贴板功能
- `theme` - 主题相关
- `build` - 构建相关

### 示例

```
feat(search): 添加模糊搜索功能

- 实现 Fuse.js 模糊搜索算法
- 添加搜索结果高亮
- 支持拼音搜索

Closes #123
```

```
fix(plugin): 修复插件加载时的内存泄漏

使用 WeakMap 存储插件实例，避免内存泄漏。

Fixes #456
```

```
docs(readme): 更新安装说明

添加 Windows 和 Linux 的安装步骤。
```

---

## 🔍 Pull Request

### PR 检查清单

提交 PR 前，请确保：

- [ ] 代码通过所有测试 (`pnpm test`)
- [ ] 前端通过 ESLint 检查 (`pnpm lint`)
- [ ] Rust 代码通过 Clippy 检查 (`cargo clippy`)
- [ ] 添加了必要的测试（单元测试、E2E 测试）
- [ ] 更新了相关文档
- [ ] 遵循代码规范
- [ ] 提交信息符合约定式提交规范

### PR 标题格式

使用约定式提交格式：

```
feat: 添加用户认证功能
fix: 修复窗口关闭时的内存泄漏
docs: 更新 README 安装说明
refactor(window): 优化窗口管理逻辑
```

### PR 描述模板

创建 PR 时，请包含：

#### 变更类型

- [ ] Bug 修复（非破坏性变更）
- [ ] 新功能（非破坏性变更）
- [ ] 破坏性变更（会导致现有功能无法正常工作）
- [ ] 文档更新
- [ ] 性能优化
- [ ] 代码重构

#### 变更说明

简要描述这个 PR 做了什么。

#### 相关 Issue

关联的 Issue 编号，例如 `Closes #123`

#### 测试说明

如何测试这些变更：
1. 步骤一
2. 步骤二
3. 步骤三

#### 截图

如果是 UI 变更，请提供截图。

### PR 审查流程

1. **自动化检查** - CI 会自动运行测试和代码检查
2. **代码审查** - 至少需要 1 个代码所有者批准
3. **修改反馈** - 根据审查意见进行修改
4. **合并** - 审查通过后合并到主分支

---

## 🏗️ 架构原则

### Tauri 应用架构（重要）

etools 遵循 Tauri 应用的职责分工原则：

#### 职责分工

- **Rust 后端 (Tauri)** - 负责所有桌面软件功能
  - 窗口管理（创建、显示、隐藏、关闭）
  - 全局快捷键、系统托盘
  - 文件系统访问、系统调用
  - 与操作系统的交互

- **前端 (React)** - 仅负责 UI 渲染和用户交互
  - 组件渲染
  - 用户输入处理
  - 通过 `invoke()` 调用后端命令

#### 关键规则

1. **窗口管理必须用 Tauri**
   - ✅ 在 Rust 后端使用 `app.get_webview_window(label)` 操作窗口
   - ❌ 不要在前端使用 `@tauri-apps/api/window` 管理窗口

2. **桌面功能优先考虑 Tauri 原生 API**
   - ✅ 全局快捷键、系统托盘、通知在 Rust 实现
   - ❌ 不要让前端承担系统级功能的职责

3. **前端只负责 UI**
   - ✅ 组件渲染、状态管理、用户交互
   - ❌ 文件系统访问、窗口管理、系统调用

#### 错误示例

```typescript
// ❌ 在前端管理窗口和快捷键
import { getCurrentWindow } from '@tauri-apps/api/window';
import { register } from '@tauri-apps/plugin-global-shortcut';

const window = getCurrentWindow();
await register('Cmd+Shift+K', () => {
  window.show(); // 职责混乱
});
```

#### 正确示例

```rust
// ✅ 在 Rust 后端管理窗口和快捷键
let window = app.get_webview_window("main").unwrap();
app.global_shortcut().on_shortcut(shortcut, move |_, _, _| {
    let _ = window.show();
})?;
```

### 添加新功能

#### 1. 添加前端组件

```bash
# 在 src/components/ 创建组件
src/components/MyFeature.tsx
```

#### 2. 添加前端服务

```bash
# 在 src/services/ 创建服务
src/services/myFeatureService.ts
```

#### 3. 添加后端命令

```bash
# 在 src-tauri/src/cmds/ 创建命令处理器
src-tauri/src/cmds/my_feature.rs
```

#### 4. 注册命令

在 `src-tauri/src/lib.rs` 中注册新命令：

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // ... 现有命令
            my_feature_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 5. 导出模块

在 `src-tauri/src/cmds/mod.rs` 中导出：

```rust
pub mod my_feature;

pub use my_feature::*;
```

### 添加新窗口

1. **在 Tauri 配置中添加窗口**

```json
// src-tauri/tauri.conf.json
{
  "app": {
    "windows": [
      {
        "label": "my-window",
        "title": "My Window",
        "width": 800,
        "height": 600
      }
    ]
  }
}
```

2. **创建 React 组件**

```tsx
// src/components/MyWindow.tsx
export function MyWindow() {
  return <div>My Window Content</div>;
}
```

3. **在 App.tsx 中注册**

```tsx
// src/App.tsx
import { MyWindow } from './components/MyWindow';

function App() {
  return (
    <>
      <SearchWindow />
      <SettingsPanel />
      <MyWindow />  {/* 新窗口 */}
    </>
  );
}
```

4. **在 Rust 后端控制窗口**

```rust
// src-tauri/src/cmds/window.rs
use tauri::AppHandle;

#[tauri::command]
pub fn show_my_window(app: AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("my-window")
        .ok_or("Window not found")?;
    window.show()?;
    Ok(())
}
```

### 添加新插件

1. **创建插件目录**

```bash
# 在 src/lib/plugins/ 或 example-plugins/ 创建
src/lib/plugins/my-plugin/
├── index.ts
└── ui.tsx (可选)
```

2. **实现插件入口**

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
    action: () => {
      console.log('Action executed!');
    },
  }];
}
```

3. **前端自动发现并加载插件**

### 修改主题

1. **修改设计变量**

```css
/* src/styles/design-tokens.css */
:root {
  --color-primary: #your-color;
  --spacing-md: #your-spacing;
}
```

2. **修改主题样式**

```css
/* src/styles/theme-light.css 或 theme-dark.css */
.my-component {
  color: var(--color-primary);
}
```

---

## 📧 联系方式

- **GitHub Issues**: https://github.com/Chee-0806/etools/issues
- **Discussions**: https://github.com/Chee-0806/etools/discussions

---

## 📄 许可证

提交贡献即表示你同意你的贡献将在 [MIT License](LICENSE) 下发布。

---

<div align="center">

**再次感谢你的贡献！🎉**

[⬆ 返回顶部](#贡献指南)

</div>
