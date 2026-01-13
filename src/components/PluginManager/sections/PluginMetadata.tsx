/**
 * Plugin Metadata Component
 */

import React from 'react';
import { formatRelativeTime } from '../../../utils/formatters';
import type { Plugin } from '../../../types/plugin';

interface PluginMetadataProps {
  plugin: Plugin;
}

export const PluginMetadata: React.FC<PluginMetadataProps> = ({ plugin }) => {
  return (
    <div className="detail-section">
      <h3>元数据</h3>
      <div className="metadata">
        <div className="metadata-item">
          <span className="metadata-label">插件 ID:</span>
          <span className="metadata-value">{plugin.manifest.id}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">触发器:</span>
          <span className="metadata-value">
            {plugin.manifest.triggers?.join(', ') || '无'}
          </span>
        </div>
        {plugin.installedAt && (
          <div className="metadata-item">
            <span className="metadata-label">安装时间:</span>
            <span className="metadata-value">
              {formatRelativeTime(plugin.installedAt, {
                emptyText: '从未',
                useDayLabels: true,
                includeWeeks: true,
              })}
            </span>
          </div>
        )}
        <div className="metadata-item">
          <span className="metadata-label">状态:</span>
          <span className={`metadata-value ${plugin.enabled ? 'enabled' : 'disabled'}`}>
            {plugin.enabled ? '已启用' : '已禁用'}
          </span>
        </div>
      </div>
    </div>
  );
};
