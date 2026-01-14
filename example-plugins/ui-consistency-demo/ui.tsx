/**
 * UI Consistency Demo Component
 * Demonstrates proper usage of etools UI components and design tokens
 */

import { useState } from 'react';
import {
  PluginUIContainer,
  Button,
  Input,
  Card,
  Badge,
  Spinner,
} from '@etools/plugin-sdk';
import './ui.css';

interface DemoData {
  name: string;
  status: 'success' | 'warning' | 'error';
  timestamp: string;
}

export function UIDemo() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DemoData | null>( null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async () => {
    if (!input.trim()) {
      setError('请输入内容');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate async operation
    setTimeout(() => {
      setResult({
        name: input,
        status: 'success',
        timestamp: new Date().toLocaleString(),
      });
      setIsLoading(false);
    }, 1500);
  };

  const handleReset = () => {
    setInput('');
    setResult(null);
    setError(null);
  };

  return (
    <PluginUIContainer
      title="UI 一致性演示"
      subtitle="展示如何使用 etools 设计系统"
      icon="🎨"
      actions={
        <>
          <Button
            variant="primary"
            onClick={handleAction}
            isLoading={isLoading}
          >
            提交
          </Button>
          <Button variant="ghost" onClick={handleReset}>
            重置
          </Button>
        </>
      }
      error={error || undefined}
      isLoading={isLoading && !result}
    >
      {/* Input Section */}
      <div className="demo-section">
        <label className="demo-label">输入内容</label>
        <Input
          placeholder="请输入一些文字..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      {/* Result Display */}
      {result && (
        <Card variant="outlined" padding="md" className="demo-result-card">
          <div className="demo-result-header">
            <h3 className="demo-result-title">处理结果</h3>
            <Badge variant="success">成功</Badge>
          </div>
          <div className="demo-result-content">
            <p className="demo-result-item">
              <span className="demo-result-label">名称:</span>
              <span>{result.name}</span>
            </p>
            <p className="demo-result-item">
              <span className="demo-result-label">时间:</span>
              <span>{result.timestamp}</span>
            </p>
          </div>
        </Card>
      )}

      {/* Component Examples */}
      <div className="demo-section">
        <h3 className="demo-section-title">组件示例</h3>

        {/* Buttons */}
        <div className="demo-subsection">
          <label className="demo-label">按钮</label>
          <div className="demo-button-group">
            <Button variant="primary" size="sm">
              主要
            </Button>
            <Button variant="secondary" size="sm">
              次要
            </Button>
            <Button variant="ghost" size="sm">
              幽灵
            </Button>
            <Button variant="danger" size="sm">
              危险
            </Button>
          </div>
        </div>

        {/* Badges */}
        <div className="demo-subsection">
          <label className="demo-label">徽章</label>
          <div className="demo-badge-group">
            <Badge variant="default">默认</Badge>
            <Badge variant="success">成功</Badge>
            <Badge variant="warning">警告</Badge>
            <Badge variant="error">错误</Badge>
            <Badge variant="info">信息</Badge>
          </div>
        </div>

        {/* Cards */}
        <div className="demo-subsection">
          <label className="demo-label">卡片</label>
          <div className="demo-card-grid">
            <Card variant="default" padding="sm" hover>
              默认卡片
            </Card>
            <Card variant="elevated" padding="sm" hover>
              抬升卡片
            </Card>
            <Card variant="outlined" padding="sm" hover>
              边框卡片
            </Card>
          </div>
        </div>
      </div>

      {/* Design Tokens */}
      <div className="demo-section">
        <h3 className="demo-section-title">设计令牌示例</h3>
        <Card variant="filled" padding="md" className="demo-tokens-card">
          <div className="demo-token-row">
            <span className="demo-token-label">间距:</span>
            <div className="demo-spacing-demo">
              <div className="demo-spacing-box" style={{ width: 'var(--spacing-2)' }} />
              <div className="demo-spacing-box" style={{ width: 'var(--spacing-3)' }} />
              <div className="demo-spacing-box" style={{ width: 'var(--spacing-4)' }} />
              <div className="demo-spacing-box" style={{ width: 'var(--spacing-6)' }} />
            </div>
          </div>
          <div className="demo-token-row">
            <span className="demo-token-label">圆角:</span>
            <div className="demo-radius-demo">
              <div className="demo-radius-box" style={{ borderRadius: 'var(--radius-sm)' }} />
              <div className="demo-radius-box" style={{ borderRadius: 'var(--radius-md)' }} />
              <div className="demo-radius-box" style={{ borderRadius: 'var(--radius-lg)' }} />
            </div>
          </div>
          <div className="demo-token-row">
            <span className="demo-token-label">阴影:</span>
            <div className="demo-shadow-demo">
              <div className="demo-shadow-box" style={{ boxShadow: 'var(--shadow-sm)' }} />
              <div className="demo-shadow-box" style={{ boxShadow: 'var(--shadow-md)' }} />
              <div className="demo-shadow-box" style={{ boxShadow: 'var(--shadow-lg)' }} />
            </div>
          </div>
        </Card>
      </div>
    </PluginUIContainer>
  );
}
