/**
 * Plugin Permissions Component
 */

import React from 'react';
import type { PluginPermission } from '../../../types/plugin';

interface PluginPermissionsProps {
  permissions: PluginPermission[];
  grantedPermissions: Set<PluginPermission> | undefined;
  onToggle: (permission: PluginPermission) => void;
}

export const PluginPermissions: React.FC<PluginPermissionsProps> = ({
  permissions,
  grantedPermissions,
  onToggle,
}) => {
  if (!permissions || permissions.length === 0) return null;

  return (
    <div className="detail-section">
      <h3>权限</h3>
      <div className="permissions-list">
        {permissions.map((permission) => {
          const granted = grantedPermissions?.has(permission);
          return (
            <div key={permission} className="permission-item">
              <span className="permission-name">{permission}</span>
              <button
                className={`permission-toggle ${granted ? 'granted' : ''}`}
                onClick={() => onToggle(permission)}
              >
                {granted ? '已授予' : '未授予'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
