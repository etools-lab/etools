/**
 * ConfirmDisableDialog Component
 * Confirmation dialog for disabling plugins
 */

import React from 'react';
import type { Plugin } from '../../types/plugin';
import './ConfirmDialog.css';

interface ConfirmDisableDialogProps {
  /**
   * Plugin to be disabled
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
 * ConfirmDisableDialog - Dialog for confirming plugin disable
 */
const ConfirmDisableDialog: React.FC<ConfirmDisableDialogProps> = ({
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
      aria-labelledby="disable-dialog-title"
      aria-describedby="disable-dialog-description"
      data-testid="confirm-disable-dialog"
    >
      <div className="confirm-dialog">
        <div className="confirm-dialog-header">
          <h2 id="disable-dialog-title" className="confirm-dialog-title">
            确认禁用插件
          </h2>
          <button
            className="confirm-dialog-close"
            onClick={onCancel}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="confirm-dialog-body" id="disable-dialog-description">
          <div className="confirm-dialog-icon">⚠️</div>
          <p className="confirm-dialog-message">
            您确定要禁用插件 <strong>{plugin.manifest.name}</strong> 吗?
          </p>
          <p className="confirm-dialog-submessage">
            禁用后,该插件将不再可用,但不会被删除。您可以随时重新启用它。
          </p>

          {plugin.manifest.permissions.length > 0 && (
            <div className="confirm-dialog-info">
              <h4>该插件当前拥有以下权限:</h4>
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
            确认禁用
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDisableDialog;
