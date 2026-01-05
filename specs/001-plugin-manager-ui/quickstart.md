# Quick Start Guide: 插件管理界面开发

**Feature**: 001-plugin-manager-ui
**Branch**: `001-plugin-manager-ui`
**For**: 开发者

---

## Prerequisites

- Node.js 18+ 和 npm
- Rust 1.75+ 和 Cargo
- Tauri CLI 2.0+
- Git

---

## Development Setup

### 1. 克隆并切换分支

```bash
cd /Users/xuqi/Codes/kaka
git checkout 001-plugin-manager-ui
```

### 2. 安装依赖

```bash
# 前端依赖
npm install

# Rust 依赖（自动处理）
cd src-tauri
cargo build
```

### 3. 启动开发服务器

```bash
# 同时启动前端和 Tauri
npm run tauri dev
```

应用窗口会自动打开，热重载已启用。

---

## Project Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    项目结构导航                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  src/                                    前端代码           │
│  ├── components/                         React 组件         │
│  │   └── PluginManager/                  NEW: 插件管理中心  │
│  ├── services/                            服务层            │
│  │   ├── pluginManager.ts                 NEW: 插件管理服务  │
│  │   └── pluginStateStore.ts              NEW: 状态管理      │
│  ├── hooks/                               自定义 Hooks      │
│  │   ├── usePluginManager.ts              NEW               │
│  │   └── useBulkSelection.ts              NEW               │
│  └── types/                               类型定义          │
│      └── plugin.ts                        EXISTING          │
│                                                             │
│  src-tauri/                              后端代码           │
│  └── src/                                 │
│      ├── cmds/                            Tauri 命令        │
│      │   ├── plugins.rs                   EXISTING (扩展)   │
│      │   └── marketplace.rs               NEW               │
│      └── services/                        Rust 服务层       │
│          └── plugin_service.rs            NEW               │
│                                                             │
│  specs/001-plugin-manager-ui/            设计文档           │
│      ├── spec.md                          功能规格          │
│      ├── plan.md                          实现计划          │
│      ├── research.md                      技术调研          │
│      ├── data-model.md                    数据模型          │
│      ├── contracts/                       API 契约          │
│      └── quickstart.md                    本文档            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Development Workflow

### 1. 创建新组件

```bash
# 创建组件文件
mkdir -p src/components/PluginManager
touch src/components/PluginManager/PluginManager.tsx
touch src/components/PluginManager/PluginManager.css

# 创建组件测试
touch src/components/PluginManager/PluginManager.test.tsx
```

### 2. 创建 Tauri 命令

```bash
# 在 src-tauri/src/cmds/ 创建新命令文件
touch src-tauri/src/cmds/marketplace.rs

# 在 src-tauri/src/lib.rs 中注册命令
```

**命令模板**:
```rust
use tauri::AppHandle;

#[tauri::command]
pub async fn my_command(param: String) -> Result<String, String> {
    Ok(format!("Hello, {}!", param))
}
```

**注册命令** (在 `src-tauri/src/lib.rs`):
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // ... existing commands
            my_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3. 前端调用 Tauri 命令

```typescript
import { invoke } from '@tauri-apps/api/core';

async function doSomething(param: string) {
  try {
    const result = await invoke('my_command', { param });
    console.log(result);
  } catch (error) {
    console.error('Command failed:', error);
  }
}
```

---

## Testing

### 运行单元测试

```bash
# 运行所有单元测试
npm test

# 监听模式（自动重新运行）
npm test -- --watch

# 覆盖率报告
npm run test:coverage

# UI 模式
npm run test:ui
```

### 运行 E2E 测试

```bash
# 运行 E2E 测试
npm run test:e2e

# UI 模式
npm run test:e2e:ui

# 调试模式（打开浏览器）
npm run test:e2e -- --debug
```

### 测试文件位置

```
tests/
├── unit/                          单元测试
│   ├── components/                组件测试
│   │   └── PluginManager.test.tsx
│   └── services/                  服务测试
│       └── pluginManager.test.ts
└── integration/                   集成测试
    └── plugin-management.test.ts
```

---

## Debugging

### 前端调试

1. **Chrome DevTools**: 开发模式下按 `F12` 或 `Cmd+Option+I`
2. **React DevTools**: 安装浏览器扩展
3. **Console 日志**:
   ```typescript
   console.log('Debug info:', data);
   console.error('Error:', error);
   ```

### 后端调试

1. **日志输出**:
   ```rust
   println!("Debug info: {:?}", data);
   eprintln!("Error: {:?}", error);
   ```

2. **Tauri 日志**: 查看终端输出

### 查看 Tauri 日志

```bash
# macOS
~/Library/Logs/com.kaka.app/

# Linux
~/.config/kaka/logs/

# Windows
%APPDATA%\com.kaka.app\logs\
```

---

## Building

### 开发构建

```bash
npm run build
```

### 生产构建

```bash
# 构建前端和 Tauri 应用
npm run tauri build

# 仅构建前端
npm run build

# 仅构建 Rust
cd src-tauri && cargo build --release
```

**构建产物位置**:
- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: `src-tauri/target/release/bundle/appimage/`
- Windows: `src-tauri/target/release/bundle/msi/`

---

## Common Tasks

### 添加新的插件权限类型

1. **更新类型定义** (`src/lib/plugin-sdk/types.ts`):
   ```typescript
   export type PluginPermission =
     | 'read_clipboard'
     | 'write_clipboard'
     | 'new_permission';  // NEW
   ```

2. **更新 Rust 后端** (`src-tauri/src/models/plugin.rs`):
   ```rust
   #[derive(Serialize, Deserialize, Debug, Clone)]
   pub enum PluginPermission {
       ReadClipboard,
       WriteClipboard,
       NewPermission,  // NEW
   }
   ```

### 添加新的插件状态

1. **更新 data-model.md**:
   ```markdown
   ### Plugin
   - `newField: string` - 新字段描述
   ```

2. **更新类型定义**:
   ```typescript
   interface Plugin {
     // ...
     newField?: string;
   }
   ```

3. **更新数据库 schema**:
   ```sql
   ALTER TABLE plugins ADD COLUMN new_field TEXT;
   ```

### 添加新的 UI 视图

1. **创建视图组件**:
   ```typescript
   // src/components/PluginManager/NewView.tsx
   export function NewView() {
     return <div>...</div>;
   }
   ```

2. **在 PluginManager 中添加路由**:
   ```typescript
   const [currentView, setCurrentView] = useState<'installed' | 'new'>('installed');

   return (
     <div>
       {currentView === 'installed' ? <InstalledView /> : <NewView />}
     </div>
   );
   ```

---

## Design System

### CSS 变量

使用项目的设计令牌：

```css
/* 颜色 */
--color-bg-primary
--color-text-primary
--color-accent-primary
--color-error

/* 间距 */
--spacing-1 (4px)
--spacing-2 (8px)
--spacing-3 (12px)
--spacing-4 (16px)

/* 圆角 */
--radius-sm
--radius-md
--radius-lg

/* 阴影 */
--shadow-sm
--shadow-md
--shadow-lg
```

### 组件复用

优先使用现有的 UI 组件：

```typescript
import { Button, Input, Badge, Spinner } from '@/components/ui';

export function MyComponent() {
  return (
    <div>
      <Button variant="primary">Click me</Button>
      <Input placeholder="Type here..." />
      <Badge variant="success">Active</Badge>
    </div>
  );
}
```

---

## Code Style

### TypeScript 规则

- 使用 `strict` 模式
- 避免使用 `any`，使用 `unknown` 代替
- 使用接口定义数据结构
- 使用类型注解导出

```typescript
// ✅ Good
export interface Plugin {
  id: string;
  name: string;
}

export async function getPlugin(id: string): Promise<Plugin | null> {
  // ...
}

// ❌ Bad
export async function getPlugin(id: any): any {
  // ...
}
```

### Rust 规则

- 使用 `Result<T, String>` 作为返回类型
- 错误消息使用 `"ERROR_CODE: Description"` 格式
- 使用 `?` 操作符传播错误

```rust
// ✅ Good
pub async fn enable_plugin(id: String) -> Result<(), String> {
    let plugin = load_plugin(&id)
        .await
        .map_err(|e| format!("PLUGIN_NOT_FOUND: {}", e))?;
    Ok(())
}

// ❌ Bad
pub async fn enable_plugin(id: String) {
    let plugin = load_plugin(&id).await.unwrap();
}
```

---

## Git Workflow

### 提交规范

使用约定式提交：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型**:
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构
- `test`: 添加测试
- `docs`: 文档更新
- `style`: 代码格式调整

**示例**:
```
feat(plugin-manager): add bulk enable functionality

Implement bulk enable plugin feature with progress tracking.

Closes #123
```

### 分支策略

- `001-plugin-manager-ui`: 功能分支
- `main`: 主分支

---

## Useful Commands

```bash
# 开发
npm run tauri dev              # 启动开发服务器

# 构建
npm run build                  # 构建前端
npm run tauri build           # 构建完整应用

# 测试
npm test                       # 单元测试
npm run test:coverage         # 覆盖率
npm run test:e2e              # E2E 测试

# 代码检查
npm run type-check            # TypeScript 类型检查
npm run lint                  # ESLint 检查

# Tauri
npm run tauri info            # Tauri 环境信息
```

---

## Environment Variables

创建 `.env` 文件（开发环境）：

```bash
# 插件市场配置
VITE_USE_MOCK_MARKETPLACE=true
VITE_MARKETPLACE_API_URL=https://api.marketplace.example.com

# 功能开关
VITE_ENABLE_BULK_OPERATIONS=true
VITE_ENABLE_USAGE_STATS=true

# 调试
VITE_DEBUG_PLUGIN_LOADING=true
```

---

## Troubleshooting

### 问题: Tauri 命令未找到

**错误**: `Error: Failed to invoke command`

**解决**:
1. 检查命令是否在 `src-tauri/src/lib.rs` 中注册
2. 重新构建: `npm run build`

### 问题: 前端无法连接到后端

**错误**: `Connection refused`

**解决**:
1. 确保开发服务器正在运行
2. 检查防火墙设置

### 问题: 热重载不工作

**解决**:
1. 重启开发服务器
2. 清除缓存: `rm -rf node_modules/.vite`

---

## Resources

### 项目文档

- [功能规格](./spec.md)
- [实现计划](./plan.md)
- [技术调研](./research.md)
- [数据模型](./data-model.md)
- [API 契约](./contracts/)

### 外部资源

- [Tauri 文档](https://tauri.app/v1/guides/)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)

---

## Getting Help

1. 查看本文档的故障排查部分
2. 查看项目的 README.md
3. 检查相关的 design docs
4. 联系项目维护者

---

**Happy Coding! 🚀**
