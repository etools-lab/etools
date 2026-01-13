/**
 * Plugin Usage Stats Component
 */

import React from 'react';
import { formatRelativeTime } from '../../../utils/formatters';
import type { PluginUsageStats as UsageStatsType } from '../../../types/plugin';

interface PluginUsageStatsProps {
  stats: UsageStatsType | null;
}

export const PluginUsageStats: React.FC<PluginUsageStatsProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="detail-section">
      <h3>使用统计</h3>
      <div className="usage-stats">
        <div className="stat-item">
          <span className="stat-label">使用次数:</span>
          <span className="stat-value">{stats.usageCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">上次使用:</span>
          <span className="stat-value">
            {formatRelativeTime(stats.lastUsed, {
              emptyText: '从未',
              useDayLabels: true,
              includeWeeks: true,
            })}
          </span>
        </div>
        {stats.lastExecutionTime && (
          <div className="stat-item">
            <span className="stat-label">上次执行时间:</span>
            <span className="stat-value">{stats.lastExecutionTime}ms</span>
          </div>
        )}
        {stats.averageExecutionTime && (
          <div className="stat-item">
            <span className="stat-label">平均执行时间:</span>
            <span className="stat-value">{stats.averageExecutionTime}ms</span>
          </div>
        )}
      </div>
    </div>
  );
};
