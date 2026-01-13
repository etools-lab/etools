/**
 * Plugin Health Section Component
 */

import React from 'react';
import { formatRelativeTime } from '../../../utils/formatters';
import type { PluginHealth } from '../../../types/plugin';

interface PluginHealthSectionProps {
  health: PluginHealth | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export const PluginHealthSection: React.FC<PluginHealthSectionProps> = ({
  health,
  refreshing,
  onRefresh,
}) => {
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✗';
      default: return '?';
    }
  };

  const getHealthText = (status: string) => {
    switch (status) {
      case 'healthy': return '健康';
      case 'warning': return '警告';
      case 'error': return '错误';
      default: return '未知';
    }
  };

  return (
    <div className="detail-section">
      <div className="section-header">
        <h3>健康状态</h3>
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={refreshing}
          title="刷新健康状态"
        >
          {refreshing ? '刷新中...' : '🔄 刷新'}
        </button>
      </div>

      {health && (
        <div className={`health-status ${health.status}`}>
          <div className="health-indicator">
            <span className={`health-icon ${health.status}`}>
              {getHealthIcon(health.status)}
            </span>
            <span className="health-text">
              {getHealthText(health.status)}
            </span>
          </div>

          {health.message && (
            <p className="health-message">{health.message}</p>
          )}

          {health.errors && health.errors.length > 0 && (
            <div className="health-errors">
              <h4>错误详情:</h4>
              {health.errors.map((error, index) => (
                <div key={index} className="error-item">
                  <code>{error.code}</code>
                  <p>{error.message}</p>
                  {error.timestamp && (
                    <small>
                      {formatRelativeTime(error.timestamp, {
                        emptyText: '从未',
                        useDayLabels: true,
                        includeWeeks: true,
                      })}
                    </small>
                  )}
                </div>
              ))}
            </div>
          )}

          {health.lastChecked && (
            <p className="last-checked">
              上次检查: {formatRelativeTime(health.lastChecked, {
                emptyText: '从未',
                useDayLabels: true,
                includeWeeks: true,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
