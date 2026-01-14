# UI 一致性演示插件

这个示例插件展示了如何创建与 etools 主容器保持一致 UI 的插件。

## 特性

- ✅ 使用 etools UI 组件库
- ✅ 使用设计令牌（Design Tokens）
- ✅ 支持浅色/深色主题
- ✅ 响应式设计
- ✅ 一致的交互体验

## 关键组件

### PluginUIContainer

标准化的插件容器组件：

```tsx
import { PluginUIContainer } from '@etools/plugin-sdk';

<PluginUIContainer
  title="我的插件"
  subtitle="插件描述"
  icon="🔌"
  actions={
    <>
      <Button variant="primary">确认</Button>
      <Button variant="ghost">取消</Button>
    </>
  }
  error={error}
  isLoading={loading}
>
  {/* 插件内容 */}
</PluginUIContainer>
```

### UI 组件

```tsx
import {
  Button,
  Input,
  Card,
  Badge,
  Spinner,
} from '@etools/plugin-sdk';
```

### 设计令牌

使用 CSS 变量保持一致性：

```css
.my-component {
  padding: var(--spacing-4);
  background: rgb(var(--color-bg-primary));
  border-radius: var(--radius-md);
  color: rgb(var(--color-text-primary));
}
```

## 安装运行

1. 将插件复制到 etools 插件目录
2. 在 etools 中搜索 `demo:` 或 `ui:` 触发插件
3. 查看 UI 演示

## 学习要点

1. **使用组件库而非自定义样式**
2. **使用设计令牌而非硬编码值**
3. **遵循 etools 的设计规范**
4. **确保主题自适应**
5. **提供清晰的视觉反馈**

## 相关文档

- [插件 UI 开发指南](../../docs/PLUGIN_UI_GUIDE.md)
- [插件 SDK 文档](../../docs/NPM_PLUGIN_DEV_GUIDE.md)
- [设计令牌参考](../../src/styles/design-tokens.css)
