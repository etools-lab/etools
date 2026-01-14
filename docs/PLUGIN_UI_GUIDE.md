# 插件 UI 开发指南

本文档指导如何创建与 etools 主容器保持一致的插件 UI。

## 🎨 设计原则

### 1. **使用 etools UI 组件库**

etools 提供了一套完整的 UI 组件库，插件应该优先使用这些组件：

```typescript
// ✅ 推荐：使用 etools UI 组件
import { Button, Input, Card, Badge } from '@etools/ui';

export function MyPluginUI() {
  return (
    <Card variant="elevated" padding="md">
      <Button variant="primary">点击我</Button>
    </Card>
  );
}

// ❌ 不推荐：使用自定义样式
export function BadPluginUI() {
  return (
    <div style={{ background: '#fff', padding: '10px' }}>
      <button style={{ background: 'blue' }}>点击我</button>
    </div>
  );
}
```

### 2. **使用设计令牌（Design Tokens）**

如果需要自定义样式，使用 etools 的 CSS 变量：

```css
/* ✅ 推荐：使用设计令牌 */
.my-plugin-container {
  background: rgb(var(--color-bg-primary));
  padding: var(--spacing-4);
  border-radius: var(--radius-md);
  color: rgb(var(--color-text-primary));
}

/* ❌ 不推荐：硬编码颜色和值 */
.my-plugin-container {
  background: #ffffff;
  padding: 16px;
  border-radius: 8px;
  color: #0f172a;
}
```

### 3. **遵循主题系统**

etools 支持浅色和深色主题，插件 UI 应自动适配：

```css
/* 使用语义化的颜色变量 */
.my-plugin-text {
  color: rgb(var(--color-text-primary));
}

.my-plugin-border {
  border: 1px solid rgb(var(--color-border-default));
}

.my-plugin-accent {
  background: rgb(var(--color-accent-primary));
}
```

## 🧩 可用组件

### 基础组件

#### Button

```typescript
import { Button } from '@etools/ui';

<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="ghost">幽灵按钮</Button>
<Button variant="danger" danger>删除</Button>
<Button size="sm">小按钮</Button>
<Button size="lg">大按钮</Button>
<Button isLoading>加载中...</Button>
```

#### Input

```typescript
import { Input } from '@etools/ui';

<Input placeholder="请输入..." />
<Input variant="filled" placeholder="填充样式" />
<Input error="这是错误信息" />
<Input leftIcon={<Icon />} rightIcon={<Icon />} />
```

#### Card

```typescript
import { Card } from '@etools/ui';

<Card variant="default" padding="md">
  内容
</Card>

<Card variant="elevated" padding="lg" hover>
  可悬停卡片
</Card>

<Card variant="glass" padding="sm">
  玻璃拟态卡片
</Card>
```

#### Badge

```typescript
import { Badge } from '@etools/ui';

<Badge variant="success">成功</Badge>
<Badge variant="warning">警告</Badge>
<Badge variant="error">错误</Badge>
<Badge variant="info">信息</Badge>
```

#### Spinner

```typescript
import { Spinner } from '@etools/ui';

<Spinner /> // 默认大小
<Spinner size="sm" />
<Spinner size="lg" />
```

### 设计令牌参考

#### 颜色

```css
/* 背景色 */
--color-bg-primary      /* 主背景 */
--color-bg-secondary    /* 次要背景 */
--color-bg-tertiary     /* 第三背景 */
--color-bg-elevated     /* 抬升背景 */

/* 文字颜色 */
--color-text-primary    /* 主文字 */
--color-text-secondary  /* 次要文字 */
--color-text-tertiary   /* 第三文字 */

/* 边框颜色 */
--color-border-subtle   /* 微妙边框 */
--color-border-default  /* 默认边框 */
--color-border-strong   /* 强调边框 */

/* 语义颜色 */
--color-accent-primary  /* 主色调 */
--color-success         /* 成功 */
--color-warning         /* 警告 */
--color-error           /* 错误 */
```

#### 间距

```css
--spacing-1: 4px
--spacing-2: 8px
--spacing-3: 12px
--spacing-4: 16px
--spacing-5: 20px
--spacing-6: 24px
--spacing-8: 32px
```

#### 圆角

```css
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
```

#### 阴影

```css
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06)
--shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08)
--shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.10)
```

## 📦 插件 UI 模板

### 基础模板

```typescript
// ui.tsx
import { Button, Input, Card, Spinner } from '@etools/ui';

interface MyPluginUIProps {
  data?: string;
  onAction?: (value: string) => void;
  isLoading?: boolean;
}

export function MyPluginUI({ data, onAction, isLoading }: MyPluginUIProps) {
  const [input, setInput] = useState('');

  return (
    <div className="plugin-ui-container">
      <Card variant="elevated" padding="lg" className="plugin-card">
        <h2 className="plugin-title">我的插件</h2>

        {isLoading ? (
          <div className="plugin-loading">
            <Spinner />
            <p>加载中...</p>
          </div>
        ) : (
          <>
            <Input
              placeholder="请输入内容"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />

            <div className="plugin-actions">
              <Button
                variant="primary"
                onClick={() => onAction?.(input)}
              >
                确认
              </Button>
              <Button variant="ghost">
                取消
              </Button>
            </div>

            {data && (
              <div className="plugin-result">
                <p>结果: {data}</p>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
```

### 样式文件

```css
/* ui.css */
.plugin-ui-container {
  width: 100%;
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: var(--spacing-4);
}

.plugin-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.plugin-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: rgb(var(--color-text-primary));
  margin: 0;
}

.plugin-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-6);
  color: rgb(var(--color-text-secondary));
}

.plugin-actions {
  display: flex;
  gap: var(--spacing-2);
}

.plugin-result {
  margin-top: var(--spacing-4);
  padding: var(--spacing-3);
  background: rgb(var(--color-bg-secondary));
  border-radius: var(--radius-md);
  color: rgb(var(--color-text-primary));
}
```

## ✅ UI 一致性检查清单

在提交插件前，请检查：

- [ ] 使用了 etools UI 组件而非自定义样式
- [ ] 使用了设计令牌（CSS 变量）而非硬编码值
- [ ] 支持浅色和深色主题自动切换
- [ ] 文字大小、间距、圆角与 etools 主界面一致
- [ ] 按钮状态（hover、active、disabled）符合预期
- [ ] 加载状态、错误状态有清晰的视觉反馈
- [ ] 响应式设计，适配不同窗口大小
- [ ] 动画效果流畅，符合 etools 的交互风格

## 🎯 最佳实践示例

查看 `example-plugins/ui-consistency-demo/` 获取完整示例。

## 📚 相关资源

- [设计令牌参考](../src/styles/design-tokens.css)
- [UI 组件库源码](../src/components/ui/)
- [插件开发指南](./NPM_PLUGIN_DEV_GUIDE.md)
