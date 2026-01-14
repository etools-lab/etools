# NPM 插件开发指南

## 开发环境测试

由于 npm 插件在生产环境中会被安装到应用数据目录（`~/Library/Application Support/etools/node_modules/`），而在开发环境中我们需要使用不同的方法来测试。

## 方法 1: 使用本地 npm 包（推荐）

### 1. 构建示例插件

```bash
cd npm-packages/@etools-plugin/hello
npm install
npm run build
```

### 2. 在项目中安装本地包

```bash
# 在项目根目录
npm install file:./npm-packages/@etools-plugin/hello
```

### 3. 重启应用

```bash
pnpm tauri dev
```

现在插件会被加载到项目的 `node_modules/@etools-plugin/hello/`，Vite 可以正常访问。

## 方法 2: 使用符号链接（高级）

### 1. 构建插件

```bash
cd npm-packages/@etools-plugin/hello
npm install
npm run build
```

### 2. 创建全局链接

```bash
cd npm-packages/@etools-plugin/hello
npm link
```

### 3. 在项目中链接

```bash
# 在项目根目录
npm link @etools-plugin/hello
```

## 方法 3: 直接加载插件源码（仅开发）

如果你正在开发插件，可以直接从源码加载而不用构建：

在 `src/services/pluginLoader.ts` 中添加开发插件路径：

```typescript
async loadBuiltInPlugins(): Promise<PluginLoadResult[]> {
  const builtInPlugins = [
    'hello-world',
    'timestamp',
    // ... 其他内置插件
  ];

  // 开发环境：直接加载 npm 插件的源码
  const devPlugins = [
    '../../npm-packages/@etools-plugin/hello/src/index.ts',
  ];

  const results: PluginLoadResult[] = [];

  // 加载内置插件
  for (const pluginId of builtInPlugins) {
    // ...
  }

  // 加载开发中的 npm 插件
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

## 发布到 npm

### 1. 测试构建

```bash
cd npm-packages/@etools-plugin/hello
npm run build
```

### 2. 检查输出

确认 `dist/` 目录包含：
- `dist/index.js` - 编译后的代码
- `dist/index.d.ts` - TypeScript 类型定义

### 3. 发布到 npm

```bash
# 首次发布
npm publish --access public

# 或更新版本
npm version patch  # 或 minor, major
npm publish --access public
```

### 4. 在 ETools 中测试

1. 重启应用
2. 打开设置 → 插件市场
3. 搜索并安装你的插件

## 生产环境说明

在生产环境中：

1. **插件安装**：
   - Rust 后端执行 `npm install @etools-plugin/hello --prefix <app_data_dir>/node_modules`
   - 插件被安装到 `~/Library/Application Support/etools/node_modules/@etools-plugin/hello/`

2. **插件加载**：
   - 前端通过 Tauri API 读取插件信息
   - 使用 `install_path` 来定位插件
   - 动态导入插件的 `dist/index.js`

3. **文件访问**：
   - Vite 的 `fs.allow` 配置只影响开发环境
   - 生产环境使用 Tauri 的文件系统 API

## 调试技巧

### 查看已安装的插件

打开浏览器控制台（F12），运行：

```javascript
// 查看已加载的插件
pluginLoader.getAllPlugins()

// 查看沙箱状态
sandbox.status()

// 查看插件指标
sandbox.metrics()
```

### 查看插件路径

```javascript
// 查看插件安装路径
const plugins = await invoke('get_installed_plugins');
plugins.forEach(p => {
  console.log(`Plugin ${p.id}:`, p.install_path);
});
```

### 测试插件

```javascript
// 测试 hello 插件
await sandbox.test('hello-world', 'hello: Test');

// 或在搜索框输入
hello: YourName
```

## 常见问题

### Q: 插件安装成功但无法加载

**A:** 检查以下几点：

1. 插件的 `package.json` 中是否有 `etools` 元数据字段
2. 插件的 `dist/index.js` 是否存在
3. 插件是否导出了正确的接口（`manifest`, `onSearch`, `init`）
4. 查看控制台是否有错误信息

### Q: 开发环境中插件热更新不生效

**A:** npm 包在开发环境中不支持热更新。需要：

1. 修改源码后重新构建：`npm run build`
2. 重启应用：`pnpm tauri dev`

或者使用方法3直接加载源码。

### Q: npm publish 失败

**A:** 检查：

1. 包名是否以 `@etools-plugin/` 开头
2. 是否已登录 npm：`npm whoami`
3. 包名是否已被占用：访问 https://www.npmjs.com/package/@etools-plugin/hello

## 相关文档

- [NPM 插件规范](./NPM_PLUGIN_SPEC.md)
- [迁移指南](./NPM_MIGRATION_GUIDE.md)
- [插件沙箱文档](./PLUGIN_SANDBOX_FINAL_SUMMARY.md)
- [插件 UI 开发指南](./PLUGIN_UI_GUIDE.md)

## 插件 UI 一致性

为了让插件与 etools 主容器保持一致的设计风格，插件开发者应该：

### 使用 etools UI 组件库

```typescript
// 从 @etools/plugin-sdk 导入 UI 组件
import {
  PluginUIContainer,
  Button,
  Input,
  Card,
  Badge,
} from '@etools/plugin-sdk';

// 使用 PluginUIContainer 创建一致的 UI
export function MyPluginUI() {
  return (
    <PluginUIContainer
      title="我的插件"
      icon="🔌"
      actions={
        <>
          <Button variant="primary">确认</Button>
          <Button variant="ghost">取消</Button>
        </>
      }
    >
      {/* 插件内容 */}
    </PluginUIContainer>
  );
}
```

### 使用设计令牌

```css
/* 使用 CSS 变量确保一致性 */
.my-plugin-element {
  padding: var(--spacing-4);
  background: rgb(var(--color-bg-primary));
  border-radius: var(--radius-md);
  color: rgb(var(--color-text-primary));
}
```

### 可用组件

- **PluginUIContainer**: 标准插件容器
- **Button**: 按钮（primary, secondary, ghost, danger）
- **Input**: 输入框（支持图标、错误状态）
- **Card**: 卡片容器（default, elevated, outlined, glass）
- **Badge**: 徽章（success, warning, error, info）
- **Spinner**: 加载指示器
- **Kbd**: 键盘快捷键显示
- **Skeleton**: 骨架屏占位符

详细的 UI 开发指南请参考 [PLUGIN_UI_GUIDE.md](./PLUGIN_UI_GUIDE.md)

### UI 示例插件

查看 `example-plugins/ui-consistency-demo/` 获取完整的 UI 最佳实践示例。
