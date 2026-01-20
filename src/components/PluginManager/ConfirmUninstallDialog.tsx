/**
 * ConfirmUninstallDialog Component
 * Confirmation dialog for uninstalling plugins
 */

import React from 'react';
import type { Plugin } from '../../types/plugin';
import './ConfirmDialog.css';

interface ConfirmUninstallDialogProps {
  /**
   * Plugin to be uninstalled
   */
  plugin: Plugin;

  /**
   * Whether the dialog is visible
   */
  isOpen: boolean;

  /**
   * Callback when confirm is clicked
   */
  onConfirm: () => void;

  /**
   * Callback when cancel is clicked
   */
  onCancel: () => void;
}

/**
 * ConfirmUninstallDialog - Dialog for confirming plugin uninstall
 */
const ConfirmUninstallDialog: React.FC<ConfirmUninstallDialogProps> = ({
  plugin,
  isOpen,
  onConfirm,
  onCancel,
}) => {
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="confirm-dialog-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="uninstall-dialog-title"
      aria-describedby="uninstall-dialog-description"
      data-testid="confirm-uninstall-dialog"
    >
      <div className="confirm-dialog">
        <div className="confirm-dialog-header">
          <h2 id="uninstall-dialog-title" className="confirm-dialog-title">
            确认卸载插件
          </h2>
          <button
            className="confirm-dialog-close"
            onClick={onCancel}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="confirm-dialog-body" id="uninstall-dialog-description">
          <div className="confirm-dialog-icon danger">⚠️</div>
          <p className="confirm-dialog-message">
            您确定要卸载插件 <strong>{plugin.manifest.name}</strong> 吗?
          </p>
          <p className="confirm-dialog-submessage warning">
            <strong>警告:</strong> 卸载将删除该插件及其所有相关数据。此操作无法撤销!
          </p>

          <div className="confirm-dialog-info">
            <h4>插件信息:</h4>
            <ul className="info-list">
              <li><strong>版本:</strong> {plugin.manifest.version}</li>
              <li><strong>作者:</strong> {plugin.manifest.author || '未知'}</li>
              {plugin.usageStats?.usageCount && (
                <li><strong>使用次数:</strong> {plugin.usageStats.usageCount}</li>
              )}
              {plugin.installedAt && (
                <li>
                  <strong>安装时间:</strong>{' '}
                  {new Date(plugin.installedAt).toLocaleString('zh-CN')}
                </li>
              )}
            </ul>
          </div>

          {plugin.manifest.permissions.length > 0 && (
            <div className="confirm-dialog-info">
              <h4>该插件拥有以下权限:</h4>
              <ul className="permission-list">
                {plugin.manifest.permissions.map((permission: string) => (
                  <li key={permission} className="permission-item">
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="confirm-dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            type="button"
          >
            取消
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            type="button"
            autoFocus
          >
            确认卸载
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmUninstallDialog;
