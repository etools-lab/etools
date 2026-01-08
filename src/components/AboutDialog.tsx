/**
 * About Dialog Component (T197)
 * Displays application information and version details
 */

import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import './AboutDialog.css';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      getVersion().then(setVersion).catch(() => setVersion('1.0.0'));

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="about-dialog-overlay" onClick={onClose}>
      <div className="about-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="about-dialog__header">
          <h2 className="about-dialog__title">关于 Kaka</h2>
          <button
            className="about-dialog__close"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="about-dialog__content">
          {/* App Icon */}
          <div className="about-dialog__icon">
            <div className="about-dialog__icon-inner">⚡</div>
          </div>

          {/* App Name */}
          <h1 className="about-dialog__app-name">Kaka</h1>
          <p className="about-dialog__tagline">生产力启动器</p>

          {/* Version */}
          <div className="about-dialog__version">
            版本 {version}
          </div>

          {/* Description */}
          <p className="about-dialog__description">
            一个现代化的桌面生产力启动器。<br/>
            使用 Tauri + React + TypeScript 构建。
          </p>

          {/* Features */}
          <div className="about-dialog__features">
            <div className="about-dialog__feature">
              <span className="about-dialog__feature-icon">🚀</span>
              <div className="about-dialog__feature-content">
                <h4>快速启动</h4>
                <p>全局快捷键，毫秒级响应</p>
              </div>
            </div>
            <div className="about-dialog__feature">
              <span className="about-dialog__feature-icon">🔍</span>
              <div className="about-dialog__feature-content">
                <h4>智能搜索</h4>
                <p>应用、文件、书签一站式搜索</p>
              </div>
            </div>
            <div className="about-dialog__feature">
              <span className="about-dialog__feature-icon">🔌</span>
              <div className="about-dialog__feature-content">
                <h4>插件系统</h4>
                <p>可扩展的插件架构</p>
              </div>
            </div>
            <div className="about-dialog__feature">
              <span className="about-dialog__feature-icon">🎨</span>
              <div className="about-dialog__feature-content">
                <h4>主题定制</h4>
                <p>支持浅色/深色主题</p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="about-dialog__links">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="about-dialog__link"
            >
              GitHub
            </a>
            <a
              href="https://github.com/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="about-dialog__link"
            >
              反馈问题
            </a>
            <a
              href="https://github.com/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="about-dialog__link"
            >
              许可证
            </a>
          </div>

          {/* Credits */}
          <p className="about-dialog__credits">
            Made with ❤️ using Tauri and React
          </p>
        </div>
      </div>
    </div>
  );
}
