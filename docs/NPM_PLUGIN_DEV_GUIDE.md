# ETools 插件开发完整指南

## 目录

1. [快速开始](#快速开始)
2. [插件系统架构](#插件系统架构)
3. [开发环境准备](#开发环境准备)
4. [插件项目结构](#插件项目结构)
5. [package.json 配置](#packagejson-配置)
6. [插件代码实现](#插件代码实现)
7. [插件 UI 开发](#插件-ui-开发)
8. [构建和打包](#构建和打包)
9. [发布到 npm](#发布到-npm)
10. [本地开发测试](#本地开发测试)
11. [调试技巧](#调试技巧)
12. [注意事项和最佳实践](#注意事项和最佳实践)
13. [常见问题](#常见问题)

---

## 快速开始

### 5 分钟创建你的第一个插件

```bash
# 1. 创建项目目录
mkdir etools-plugin-hello && cd etools-plugin-hello

# 2. 初始化 npm 包
npm init -y

# 3. 安装开发依赖
npm install --save-dev typescript tsup

# 4. 创建 package.json（见下文配置）
# 5. 创建源码 src/index.ts（见下文代码）
# 6. 构建
npm run build

# 7. 发布到 npm
npm publish --access public
```

---

## 插件系统架构

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        ETools 主应用                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │PluginLoader  │  │PluginManager │  │PluginSandbox │    │
│  │   (加载器)   │  │  (管理器)    │  │   (沙箱)     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                 │                 │               │
│         │                 │                 │               │
│         ▼                 ▼                 ▼               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  动态导入     │  │ Tauri 后端   │  │ Web Worker   │    │
│  │  npm 插件    │  │   通信       │  │   执行器     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │
                    ┌──────▼────────┐
                    │  NPM Registry │
                    └───────────────┘
```

### 核心组件说明

| 组件 | 职责 | 文件位置 |
|------|------|---------|
| **PluginLoader** | 动态加载插件模块，验证 manifest | `etools/src/services/pluginLoader.ts` |
| **PluginManager** | 与 Tauri 后端通信，管理插件 CRUD | `etools/src/services/pluginManager.ts` |
| **PluginSandbox** | 提供 Worker 隔离执行环境，权限检查 | `etools/src/services/pluginSandbox.ts` |
| **MarketplaceService** | 从 npm registry 搜索和安装插件 | `etools/src/services/pluginManager.ts` |

### 插件执行流程

```
用户输入搜索关键词
    ↓
PluginLoader.searchByTrigger(query)
    ↓
遍历已加载插件，检查触发词匹配
    ↓
调用 PluginSandbox.executePluginModule()
    ↓
获取 Web Worker（从池中复用或创建）
    ↓
Worker 动态导入插件模块
    ↓
执行 plugin.onSearch(query)
    ↓
返回 PluginSearchResultV2[]（包含 actionData）
    ↓
前端渲染搜索结果
    ↓
用户点击结果 → 执行 actionData 指定的动作
```

---

## 开发环境准备

### 必需工具

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **TypeScript**: >= 5.0.0
- **tsup**: ^8.0.0（推荐）或 tsc（传统方式）

### 安装依赖

```bash
# 方式 1: 使用 tsup（推荐，支持 JSX）
npm install --save-dev typescript tsup

# 方式 2: 使用 tsc（传统方式）
npm install --save-dev typescript
```

### TypeScript 配置

**tsup 方式（推荐）：**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**tsc 方式（传统）：**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

---

## 插件项目结构

### 推荐项目结构

```
etools-plugin-hello/
├── package.json              # npm 包配置（包含 etools 元数据）
├── tsconfig.json            # TypeScript 配置
├── README.md                # 插件文档
├── src/
│   ├── index.ts            # 插件主入口（必需）
│   ├── types.ts            # 类型定义（可选）
│   └── ui.tsx             # UI 组件（可选）
├── dist/                   # 编译输出（自动生成）
│   ├── index.js
│   └── index.d.ts
└── assets/                 # 可选：资源文件
    └── icon.png
```

### 文件说明

| 文件 | 说明 | 必需 |
|------|------|------|
| `package.json` | npm 包配置，包含 `etools` 元数据字段 | ✅ |
| `src/index.ts` | 插件主入口，导出 `manifest` 和 `onSearch` | ✅ |
| `src/ui.tsx` | 插件 UI 组件（需要 UI 时必需） | ❌ |
| `tsconfig.json` | TypeScript 编译配置 | ✅ |
| `README.md` | 插件使用说明 | ❌ |
| `assets/` | 图标等静态资源 | ❌ |

---

## package.json 配置

### 完整示例

```json
{
  "name": "@etools-plugin/hello",
  "version": "1.0.0",
  "description": "Hello World plugin for ETools",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "files": [
    "dist",
    "assets",
    "README.md"
  ],
  "scripts": {
    "build": "tsup src/index.ts --format esm --clean",
    "build:ui": "tsup src/index.ts src/ui.tsx --format esm --clean",
    "build:dts": "tsup src/index.ts --format esm --dts --clean",
    "dev": "tsup src/index.ts --format esm --watch",
    "dev:ui": "tsup src/index.ts src/ui.tsx --format esm --watch",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "etools-plugin",
    "productivity",
    "hello"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/etools-plugin-hello.git"
  },
  "homepage": "https://github.com/your-org/etools-plugin-hello",
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    }
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.0.0 || ^19.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  },
  "etools": {
    "id": "hello-world",
    "displayName": "Hello Plugin",
    "description": "A simple greeting plugin",
    "category": "productivity",
    "icon": "👋",
    "triggers": ["hello:"],
    "permissions": [],
    "homepage": "https://github.com/your-org/etools-plugin-hello"
  }
}
```

### 必需字段说明

#### npm 标准字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `name` | npm 包名，**必须**以 `@etools-plugin/` 开头 | `@etools-plugin/hello` |
| `version` | 语义化版本号 | `1.0.0` |
| `main` | 入口文件路径 | `dist/index.js` |
| `types` | TypeScript 类型定义文件 | `dist/index.d.ts` |
| `keywords` | 搜索关键词，**必须**包含 `etools-plugin` | `["etools-plugin"]` |

#### etools 元数据字段

在 `package.json` 的 `etools` 字段中定义：

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 插件唯一标识符（不含 `@etools-plugin/` 前缀） |
| `displayName` | string | ✅ | 插件显示名称 |
| `description` | string | ✅ | 插件简短描述（50 字以内） |
| `category` | string | ❌ | 插件分类（默认 `utilities`） |
| `icon` | string | ❌ | 图标（emoji 或路径） |
| `triggers` | string[] | ✅ | 触发关键词列表（至少 1 个） |
| `permissions` | string[] | ❌ | 权限列表（默认空） |
| `homepage` | string | ❌ | 项目主页 URL |

### 可用分类

```typescript
type PluginCategory =
  | 'productivity'   // 生产力工具
  | 'developer'      // 开发者工具
  | 'utilities'      // 实用工具（默认）
  | 'search'         // 搜索增强
  | 'media'          // 媒体处理
  | 'integration';   // 第三方集成
```

### 可用权限

```typescript
type PluginPermission =
  | 'read:clipboard'     // 读取剪贴板
  | 'write:clipboard'    // 写入剪贴板
  | 'read:files'         // 读取文件
  | 'write:files'        // 写入文件
  | 'network:request'    // 网络请求
  | 'shell:execute'      // Shell 命令
  | 'show:notification'  // 系统通知
  | 'settings:access';   // 访问设置
```

**权限映射到 Tauri 命令：**

| 权限 | Tauri 命令 |
|------|-----------|
| `read:clipboard` | `get_clipboard_history`, `paste_clipboard_item` |
| `write:clipboard` | `copy_to_clipboard` |
| `read:files` | `read_file` |
| `write:files` | `write_file` |
| `network:request` | `http_request` |
| `shell:execute` | `open`, `execute_shell` |
| `show:notification` | `send_notification` |

---

## 插件代码实现

### 基础插件模板

```typescript
/**
 * @etools-plugin/hello
 * Hello World Plugin for ETools
 */

// ============================================================================
// 1. 导入类型
// ============================================================================

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  triggers: string[];
}

export interface PluginSearchResultV2 {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  actionData: {
    type: 'popup' | 'clipboard' | 'open-url' | 'custom' | 'none' | 'open-ui';
    description?: string;
    pluginId?: string;
    toolId?: string;
    query?: string;
    data?: {
      popup?: {
        title: string;
        message: string;
        icon?: string;
        style?: 'info' | 'success' | 'warning' | 'error';
        buttons?: Array<{ label: string; value: string; isPrimary?: boolean }>;
      };
      clipboard?: { text: string; type?: 'text' | 'image' };
      url?: { href: string; target?: '_self' | '_blank' };
      custom?: Record<string, unknown>;
    };
  };
}

export interface PluginV2 {
  manifest: PluginManifest;
  onSearch: (query: string) => Promise<PluginSearchResultV2[]>;
  init?: () => Promise<void>;
  onDestroy?: () => Promise<void>;
  ui?: {
    component: React.ComponentType<any>;
  };
}

// ============================================================================
// 2. 定义 manifest
// ============================================================================

export const manifest: PluginManifest = {
  id: 'hello-world',
  name: 'Hello World',
  version: '1.0.0',
  description: 'A simple hello world plugin',
  author: 'Your Name',
  permissions: [],
  triggers: ['hello:', 'hi:'],
};

// ============================================================================
// 3. 实现 onSearch 函数
// ============================================================================

/**
 * 搜索函数 - 用户输入时触发
 * @param query 用户输入的查询字符串
 * @returns 搜索结果数组
 */
export async function onSearch(query: string): Promise<PluginSearchResultV2[]> {
  const results: PluginSearchResultV2[] = [];

  // 检查触发词
  if (query.match(/^hello:|^hi:/i)) {
    const name = query.split(':')[1].trim() || 'World';

    results.push({
      id: `hello-${Date.now()}`,
      title: `Hello, ${name}!`,
      description: 'Click to display greeting',
      icon: '👋',
      actionData: {
        type: 'popup',
        description: 'Show greeting popup',
        data: {
          popup: {
            title: 'Hello World',
            message: `Hello, ${name}! 👋`,
            icon: '👋',
            style: 'success',
            buttons: [
              { label: '确定', value: 'ok', isPrimary: true }
            ]
          },
        },
      },
    });
  }

  return results;
}

// ============================================================================
// 4. 实现 init 函数（可选）
// ============================================================================

/**
 * 初始化函数 - 插件加载时调用
 */
export async function init() {
  console.log('[HelloPlugin] Plugin initialized');
}

// ============================================================================
// 5. 实现 onDestroy 函数（可选）
// ============================================================================

/**
 * 销毁函数 - 插件卸载时调用
 */
export async function onDestroy() {
  console.log('[HelloPlugin] Plugin destroyed');
}

// ============================================================================
// 6. 导出插件对象
// ============================================================================

const plugin: PluginV2 = {
  manifest,
  onSearch,
  init,
  onDestroy,
};

export default plugin;
```

### actionData 类型详解

#### 1. popup - 弹窗

```typescript
actionData: {
  type: 'popup',
  data: {
    popup: {
      title: '提示',
      message: '操作成功',
      icon: '✅',
      style: 'success', // 'info' | 'success' | 'warning' | 'error'
      buttons: [
        { label: '确定', value: 'ok', isPrimary: true },
        { label: '取消', value: 'cancel' }
      ]
    }
  }
}
```

#### 2. clipboard - 剪贴板

```typescript
actionData: {
  type: 'clipboard',
  data: {
    clipboard: {
      text: 'Text to copy',
      type: 'text' // 'text' | 'image'
    }
  }
}
```

#### 3. open-url - 打开链接

```typescript
actionData: {
  type: 'open-url',
  data: {
    url: {
      href: 'https://example.com',
      target: '_blank' // '_self' | '_blank'
    }
  }
}
```

#### 4. open-ui - 打开插件 UI

```typescript
actionData: {
  type: 'open-ui',
  pluginId: 'your-plugin-id',
  toolId: 'your-tool-id',
  query: 'user-input'
}
```

---

## 插件 UI 开发

### UI 组件库

ETools 提供了完整的 UI 组件库，确保插件与主应用保持一致的视觉风格。

### 导入组件

```typescript
import {
  Button,
  Input,
  Card,
  Badge,
  Spinner,
  Kbd,
  Skeleton,
  DragDropZone,
  PluginUIContainer
} from '@etools/plugin-sdk';
```

### PluginUIContainer 使用

```typescript
import { PluginUIContainer, Button } from '@etools/plugin-sdk';

export function MyPluginUI() {
  return (
    <PluginUIContainer
      title="我的插件"
      subtitle="插件描述"
      icon="🎨"
      actions={
        <>
          <Button variant="primary">确定</Button>
          <Button variant="ghost">取消</Button>
        </>
      }
    >
      <div>插件内容</div>
    </PluginUIContainer>
  );
}
```

### 设计令牌

使用 CSS 变量确保主题一致性：

```css
.my-plugin-container {
  background: rgb(var(--color-bg-primary));
  padding: var(--spacing-4);
  border-radius: var(--radius-md);
  color: rgb(var(--color-text-primary));
}
```

**可用变量：**

- `--color-bg-primary` - 主背景色
- `--color-text-primary` - 主文字色
- `--spacing-1` 到 `--spacing-12` - 间距（4px - 48px）
- `--radius-sm` 到 `--radius-full` - 圆角
- `--shadow-sm` 到 `--shadow-xl` - 阴影

### UI 组件导出

```typescript
// src/index.ts
import { MyPluginUI } from './ui';

const plugin: PluginV2 = {
  manifest,
  onSearch,
  ui: { component: MyPluginUI },
};

export default plugin;
```

---

## 构建和打包

### 使用 tsup（推荐）

```bash
# 构建基础插件
npm run build

# 构建 UI 插件
npm run build:ui

# 构建类型定义
npm run build:dts

# 开发模式（监听文件变化）
npm run dev
```

### tsup 配置（可选）

创建 `tsup.config.ts`：

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/ui.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['react'],
  treeshake: true,
  sourcemap: true,
});
```

### 使用 tsc（传统方式）

```bash
# 构建
npm run build

# 开发模式
npm run dev
```

### 输出目录结构

构建后的 `dist/` 目录应该包含：

```
dist/
├── index.js      # 编译后的代码
└── index.d.ts    # TypeScript 类型定义
```

---

## 发布到 npm

### 1. 检查包名

```bash
# 检查包名是否可用
npm view @etools-plugin/your-plugin-name
```

如果返回 `404 Not Found`，说明包名可用。

### 2. 登录 npm

```bash
# 登录 npm（首次发布）
npm login
```

### 3. 发布

```bash
# 构建插件
npm run build

# 发布到 npm
npm publish --access public
```

### 4. 验证发布

```bash
# 搜索你的插件
npm search @etools-plugin/your-plugin-name

# 或访问 npmjs.com
# https://www.npmjs.com/package/@etools-plugin/your-plugin-name
```

### 版本管理

使用语义化版本（Semver）：

```bash
# 1.0.0 → 1.0.1 - Bug 修复
npm version patch

# 1.0.0 → 1.1.0 - 新功能，向后兼容
npm version minor

# 1.0.0 → 2.0.0 - 破坏性变更
npm version major

# 发布新版本
npm publish --access public
```

---

## 本地开发测试

### 方法 1: 使用本地 npm 包（推荐）

```bash
# 1. 在插件目录构建插件
cd etools-plugin-hello
npm run build

# 2. 在 etools 项目根目录安装本地包
cd ../../etools
npm install file:../etools-plugin-hello

# 3. 启动 etools
pnpm tauri dev
```

### 方法 2: 使用符号链接（高级）

```bash
# 1. 在插件目录创建全局链接
cd etools-plugin-hello
npm link

# 2. 在 etools 项目中链接
cd ../../etools
npm link @etools-plugin/hello

# 3. 重启 etools
pnpm tauri dev
```

### 方法 3: 临时加载源码（仅开发）

修改 `etools/src/services/pluginLoader.ts`，在 `loadBuiltInPlugins()` 中添加：

```typescript
async loadBuiltInPlugins(): Promise<PluginLoadResult[]> {
  const devPlugins = [
    '../../etools-plugin-hello/src/index.ts',
  ];

  for (const pluginPath of devPlugins) {
    try {
      const result = await this.loadPlugin(pluginPath);
      results.push(result);
    } catch (error) {
      console.error(`[PluginLoader] Failed to load dev plugin:`, error);
    }
  }

  return results;
}
```

### 测试插件

1. **在 ETools 中测试**：
   - 打开 ETools
   - 输入触发词（如 `hello:`）
   - 查看搜索结果
   - 点击结果执行动作

2. **浏览器控制台调试**：
   ```javascript
   // 查看已加载的插件
   pluginLoader.getAllPlugins()

   // 测试插件搜索
   await pluginLoader.searchByTrigger('hello:test')

   // 查看沙箱状态
   sandbox.status()
   sandbox.metrics()
   ```

---

## 调试技巧

### 查看插件日志

插件的所有 `console.log` 会被转发到浏览器控制台，带有 `[Plugin:plugin-id]` 前缀：

```typescript
export async function onSearch(query: string) {
  console.log('[MyPlugin] Search query:', query); // 会在控制台显示
  // ...
}
```

### 使用沙箱开发工具

在浏览器控制台使用 `window.sandbox` 命令：

```javascript
// 查看沙箱状态
sandbox.status()

// 获取沙箱指标
sandbox.metrics()

// 列出所有插件
sandbox.list()

// 获取特定插件指标
sandbox.pluginMetrics('hello-world')

// 测试插件执行
sandbox.test('hello-world', 'hello:test')

// 启用/禁用插件
sandbox.enable('hello-world')
sandbox.disable('hello-world')

// 重置崩溃计数
sandbox.resetCrashes('hello-world')

// 显示帮助
sandbox.help()
```

### 常见调试场景

#### 插件未加载

1. 检查 `package.json` 的 `etools` 字段是否正确
2. 检查 `dist/index.js` 是否存在
3. 检查插件是否导出了正确的接口（`manifest`, `onSearch`）
4. 查看控制台是否有错误信息

#### 触发词不匹配

1. 检查 `triggers` 数组是否包含正确的触发词
2. 检查 `onSearch` 函数中的匹配逻辑
3. 使用 `sandbox.test()` 手动测试

#### 权限错误

1. 检查 `permissions` 数组是否包含所需的权限
2. 检查插件 manifest 的权限声明
3. 使用 `sandbox.pluginMetrics(pluginId)` 查看权限状态

---

## 注意事项和最佳实践

### 1. 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 包名 | `@etools-plugin/<name>` | `@etools-plugin/hello` |
| 插件 ID | 小写，连字符 | `hello-world` |
| 触发词 | 小写，以冒号结尾 | `hello:`, `dev:` |
| 类名 | PascalCase | `MyPlugin` |
| 函数名 | camelCase | `onSearch`, `init` |

### 2. 错误处理

```typescript
export async function onSearch(query: string): Promise<PluginSearchResultV2[]> {
  try {
    // 插件逻辑
    return results;
  } catch (error) {
    console.error('[MyPlugin] Error:', error);
    return []; // 失败时返回空数组，避免阻塞其他插件
  }
}
```

### 3. 性能优化

#### 使用缓存

```typescript
const cache = new Map<string, PluginSearchResultV2[]>();

export async function onSearch(query: string): Promise<PluginSearchResultV2[]> {
  if (cache.has(query)) {
    return cache.get(query)!;
  }

  const results = await computeResults(query);
  cache.set(query, results);
  return results;
}
```

#### 避免阻塞

- 使用异步操作（`async/await`）
- 避免长时间同步计算
- 复杂数据处理考虑使用 Web Worker

### 4. 权限最小化

只声明必需的权限：

```json
{
  "etools": {
    "permissions": ["write:clipboard"] // 只申请需要的权限
  }
}
```

### 5. 用户体验

- 提供清晰的描述和图标
- 合理的触发词（简短、易记）
- 有意义的搜索结果排序
- 适当的错误提示

### 6. 文档

- 提供详细的 `README.md`
- 注释复杂的逻辑
- 提供使用示例

### 7. 测试

- 在本地充分测试
- 测试边界情况
- 验证权限功能
- 测试 UI 交互

### 8. 版本管理

- 遵循语义化版本（Semver）
- 在 CHANGELOG 中记录变更
- 避免破坏性变更

### 9. 发布检查清单

发布前检查：

- [ ] `package.json` 配置正确
- [ ] `etools` 元数据字段完整
- [ ] `main` 和 `types` 路径正确
- [ ] 构建成功，`dist/` 目录存在
- [ ] 所有必需接口已导出（`manifest`, `onSearch`）
- [ ] 插件在本地测试通过
- [ ] `keywords` 包含 `etools-plugin`
- [ ] 包名以 `@etools-plugin/` 开头
- [ ] README.md 文档完整

---

## 常见问题

### Q1: 插件安装成功但无法加载

**可能原因：**

1. **manifest 字段缺失**
   - 检查 `src/index.ts` 是否导出了 `manifest`
   - 检查 manifest 的必需字段（`id`, `name`, `version`）

2. **编译输出路径错误**
   - 检查 `package.json` 的 `main` 字段
   - 确认 `dist/index.js` 存在

3. **导出格式错误**
   - 确认使用 `export default plugin;`
   - 或同时导出 `export const manifest;` 和 `export async function onSearch();`

**解决方法：**

```typescript
// 检查插件是否正确导出
console.log(plugin); // 应该包含 manifest 和 onSearch

// 查看控制台错误
// 打开浏览器控制台，查看 [PluginLoader] 相关日志
```

### Q2: 触发词不生效

**可能原因：**

1. **触发词配置错误**
   - 检查 `manifest.triggers` 数组
   - 触发词格式是否正确（如 `hello:`）

2. **匹配逻辑错误**
   - 检查 `onSearch` 中的匹配条件
   - 是否区分大小写

**解决方法：**

```typescript
export async function onSearch(query: string) {
  // 添加调试日志
  console.log('[MyPlugin] Query:', query);

  // 使用不区分大小写的匹配
  if (query.match(/^hello:/i)) {
    // ...
  }
}
```

### Q3: npm publish 失败

**可能原因：**

1. **包名冲突**
   - 检查包名是否已被占用

2. **未登录 npm**
   - 运行 `npm login`

3. **权限不足**
   - 确认是 `@etools-plugin` 组织成员

4. **缺少 `--access public`**
   - scoped 包需要显式指定公开

**解决方法：**

```bash
# 检查包名是否可用
npm view @etools-plugin/your-name

# 登录 npm
npm login

# 发布公开包
npm publish --access public
```

### Q4: 插件 UI 组件无法加载

**可能原因：**

1. **UI 组件未导出**
   - 检查 `src/ui.tsx` 是否正确导出组件

2. **React 依赖问题**
   - 检查 `peerDependencies` 配置
   - React 应标记为 `optional`

3. **JSX 配置错误**
   - 检查 `tsconfig.json` 的 `jsx` 选项
   - 应设置为 `react-jsx`

**解决方法：**

```json
// package.json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    }
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

### Q5: 权限错误

**可能原因：**

1. **权限未声明**
   - 检查 `package.json` 的 `etools.permissions`

2. **API 调用错误**
   - 检查是否使用了需要权限的 Tauri 命令

**解决方法：**

```json
{
  "etools": {
    "permissions": ["write:clipboard"]
  }
}
```

### Q6: 插件被自动禁用

**原因：**

- 插件连续崩溃 3 次以上
- 沙箱检测到插件执行超时

**解决方法：**

```javascript
// 查看崩溃原因
sandbox.pluginMetrics('your-plugin-id')

// 重置崩溃计数
sandbox.resetCrashes('your-plugin-id')

// 重新启用插件
sandbox.enable('your-plugin-id')
```

### Q7: 如何调试插件热更新

**开发环境不支持热更新**，需要：

1. 修改源码后重新构建：`npm run build`
2. 重启 ETools：`pnpm tauri dev`

或者使用方法 3 直接加载源码（参见[本地开发测试](#本地开发测试)）。

### Q8: 插件在市场搜索不到

**可能原因：**

1. **keywords 缺失**
   - 检查 `package.json` 的 `keywords`
   - 必须包含 `etools-plugin`

2. **npm 同步延迟**
   - npm registry 可能需要几分钟同步

**解决方法：**

```json
{
  "keywords": [
    "etools-plugin",
    "your-keywords"
  ]
}
```

### Q9: 如何查看插件执行日志

```javascript
// 在浏览器控制台
// 1. 查看插件日志（带 [Plugin:plugin-id] 前缀）
// 2. 使用沙箱工具
sandbox.metrics()

// 3. 查看特定插件指标
sandbox.pluginMetrics('your-plugin-id')
```

### Q10: 如何测试权限功能

```typescript
// 1. 在 package.json 中声明权限
{
  "etools": {
    "permissions": ["write:clipboard"]
  }
}

// 2. 在插件中使用权限
export async function onSearch(query: string) {
  const results = [{
    id: 'copy-text',
    title: 'Copy Text',
    actionData: {
      type: 'clipboard',
      data: {
        clipboard: {
          text: 'Hello World'
        }
      }
    }
  }];
  return results;
}
```

---

## 参考资源

### 官方文档

- [NPM 插件规范](./NPM_PLUGIN_SPEC.md)
- [插件 UI 开发指南](./PLUGIN_UI_GUIDE.md)
- [迁移指南](./NPM_MIGRATION_GUIDE.md)
- [插件沙箱文档](./PLUGIN_SANDBOX_FINAL_SUMMARY.md)

### 示例插件

- `@etools-plugin/hello` - Hello World 示例
- `@etools-plugin/devtools` - 开发者工具
- `example-plugins/ui-consistency-demo/` - UI 一致性示例

### 核心代码位置

- `etools/src/services/pluginLoader.ts` - 插件加载器
- `etools/src/services/pluginManager.ts` - 插件管理器
- `etools/src/services/pluginSandbox.ts` - 沙箱服务
- `etools/src/lib/plugin-sdk/` - SDK 实现

### 外部链接

- [npm 组织](https://www.npmjs.com/org/etools-plugin)
- [ETools GitHub](https://github.com/etools-team/etools)

---

## 技术支持

如有问题，请：

1. 查看本文档的[常见问题](#常见问题)部分
2. 查看浏览器控制台日志
3. 使用 `sandbox.status()` 调试
4. 在 [GitHub Issues](https://github.com/etools-team/etools/issues) 提问

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-20
