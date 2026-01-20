/**
 * PluginDetailPanel Component
 * Display detailed plugin information including health and usage stats
 */

import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { usePluginState, usePluginDispatch } from '../../services/pluginStateStore';
import { pluginManagerService } from '../../services/pluginManager';
import { pluginAbbreviationService, PluginAbbreviationService } from '../../services/pluginAbbreviationService';
import {
  PluginHealthSection,
  PluginUsageStats,
  PluginPermissions,
  PluginAbbreviations,
  PluginMetadata,
} from './sections';
import type { Plugin, PluginHealth, PluginUsageStats as UsageStatsType, PluginPermission, PluginAbbreviation } from '../../types/plugin';
import './PluginDetailPanel.css';

// ============================================================================
// Types
// ============================================================================

interface PluginDetailPanelProps {
  pluginId: string;
  onClose?: () => void;
}

// ============================================================================
// Custom Hook for Plugin Abbreviations
// ============================================================================

function usePluginAbbreviations(pluginId: string, dispatch: ReturnType<typeof usePluginDispatch>) {
  const [abbreviations, setAbbreviations] = useState<PluginAbbreviation[]>([]);
  const [newAbbrKeyword, setNewAbbrKeyword] = useState('');
  const [abbrError, setAbbrError] = useState<string | null>(null);

  const loadAbbreviations = useCallback(async () => {
    const config = await invoke<Record<string, PluginAbbreviation[]>>('get_plugin_abbreviations');
    const abbrs = config[pluginId] || [];
    setAbbreviations(abbrs);
    return abbrs;
  }, [pluginId]);

  const handleAdd = useCallback(async () => {
    if (!newAbbrKeyword.trim()) return;

    const validation = PluginAbbreviationService.isValidKeyword(newAbbrKeyword.trim());
    if (!validation.valid) {
      setAbbrError(validation.error || '无效的关键词');
      return;
    }

    if (abbreviations.some(abbr => abbr.keyword.toLowerCase() === newAbbrKeyword.trim().toLowerCase())) {
      setAbbrError('此关键词已存在');
      return;
    }

    try {
      const newAbbr: PluginAbbreviation = {
        keyword: newAbbrKeyword.trim().toLowerCase(),
        enabled: true,
      };

      await pluginAbbreviationService.setAbbreviation(pluginId, newAbbr);
      await loadAbbreviations();

      setNewAbbrKeyword('');
      setAbbrError(null);

      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: { type: 'success', title: '缩写添加成功', message: `已添加缩写 "${newAbbr.keyword}"` },
      });
    } catch (error) {
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: { type: 'error', title: '添加失败', message: error instanceof Error ? error.message : '未知错误' },
      });
    }
  }, [pluginId, newAbbrKeyword, abbreviations, loadAbbreviations, dispatch]);

  const handleRemove = useCallback(async (keyword: string) => {
    try {
      await pluginAbbreviationService.removeAbbreviation(pluginId, keyword);
      await loadAbbreviations();

      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: { type: 'success', title: '缩写已删除', message: `已删除缩写 "${keyword}"` },
      });
    } catch (error) {
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: { type: 'error', title: '删除失败', message: error instanceof Error ? error.message : '未知错误' },
      });
    }
  }, [pluginId, loadAbbreviations, dispatch]);

  const handleToggle = useCallback(async (keyword: string) => {
    try {
      const abbr = abbreviations.find(a => a.keyword === keyword);
      if (!abbr) return;

      const updatedAbbr: PluginAbbreviation = { keyword, enabled: !abbr.enabled };
      await pluginAbbreviationService.setAbbreviation(pluginId, updatedAbbr);
      await loadAbbreviations();
    } catch (error) {
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: { type: 'error', title: '更新失败', message: error instanceof Error ? error.message : '未知错误' },
      });
    }
  }, [pluginId, abbreviations, loadAbbreviations, dispatch]);

  const handleKeywordChange = useCallback((value: string) => {
    setNewAbbrKeyword(value);
    setAbbrError(null);
  }, []);

  return {
    abbreviations,
    newAbbrKeyword,
    abbrError,
    loadAbbreviations,
    handleAdd,
    handleRemove,
    handleToggle,
    handleKeywordChange,
  };
}

// ============================================================================
// Main Component
// ============================================================================

const PluginDetailPanel: React.FC<PluginDetailPanelProps> = ({ pluginId, onClose }) => {
  const dispatch = usePluginDispatch();
  const state = usePluginState();

  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [health, setHealth] = useState<PluginHealth | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStatsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingHealth, setRefreshingHealth] = useState(false);

  const abbrState = usePluginAbbreviations(pluginId, dispatch);

  /**
   * Load plugin details
   */
  const loadPluginDetails = useCallback(async () => {
    if (!pluginId) return;

    setLoading(true);
    try {
      const foundPlugin = state.plugins.find((p) => p.manifest.id === pluginId);
      if (foundPlugin) {
        setPlugin(foundPlugin);

        // Load health
        try {
          const healthData = await pluginManagerService.getPluginHealth(pluginId);
          setHealth(healthData);
        } catch {
          setHealth({ status: 'unknown', message: '健康检查不可用', lastChecked: Date.now(), errors: [] });
        }

        // Load usage stats
        try {
          const statsData = await pluginManagerService.getPluginUsageStats(pluginId);
          setUsageStats(statsData);
        } catch {
          setUsageStats({ lastUsed: null, usageCount: 0, lastExecutionTime: null, averageExecutionTime: null });
        }

        // Load abbreviations
        await abbrState.loadAbbreviations();
      }
    } catch (error) {
      console.error('Failed to load plugin details:', error);
    } finally {
      setLoading(false);
    }
  }, [pluginId, state.plugins, abbrState.loadAbbreviations]);

  /**
   * Refresh health status
   */
  const handleRefreshHealth = useCallback(async () => {
    if (!pluginId) return;

    setRefreshingHealth(true);
    try {
      const healthData = await pluginManagerService.refreshPluginHealth(pluginId);
      setHealth(healthData);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: { type: 'success', title: '健康检查完成', message: '插件健康状态已更新' },
      });
    } catch {
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: { type: 'warning', title: '健康检查不可用', message: '插件健康检查功能暂未实现' },
      });
    } finally {
      setRefreshingHealth(false);
    }
  }, [pluginId, dispatch]);

  /**
   * Toggle permission
   */
  const handleTogglePermission = useCallback(async (permission: PluginPermission) => {
    if (!plugin) return;

    const currentPermissions = plugin.grantedPermissions || new Set<PluginPermission>();
    const hasPermission = currentPermissions.has(permission);

    try {
      if (hasPermission) {
        await pluginManagerService.revokePermissions(plugin.manifest.id, [permission]);
      } else {
        await pluginManagerService.grantPermissions(plugin.manifest.id, [permission]);
      }
      await loadPluginDetails();
    } catch (error) {
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: { type: 'error', title: '权限更新失败', message: error instanceof Error ? error.message : '未知错误' },
      });
    }
  }, [plugin, loadPluginDetails, dispatch]);

  useEffect(() => {
    loadPluginDetails();
  }, [loadPluginDetails]);

  // Loading state
  if (loading) {
    return (
      <div className="plugin-detail-panel">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>加载插件详情...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!plugin) {
    return (
      <div className="plugin-detail-panel">
        <div className="error-state">
          <p>插件未找到</p>
        </div>
      </div>
    );
  }

  return (
    <div className="plugin-detail-panel">
      {/* Header */}
      <div className="detail-header">
        <div className="plugin-info">
          <h2 className="plugin-name">{plugin.manifest.name}</h2>
          <p className="plugin-version">v{plugin.manifest.version}</p>
          <p className="plugin-author">by {plugin.manifest.author || '未知作者'}</p>
        </div>
        {onClose && (
          <button className="close-btn" onClick={onClose} title="关闭">
            ✕
          </button>
        )}
      </div>

      {/* Description */}
      {plugin.manifest.description && (
        <div className="detail-section">
          <h3>描述</h3>
          <p className="plugin-description">{plugin.manifest.description}</p>
        </div>
      )}

      {/* Health Status */}
      <PluginHealthSection
        health={health}
        refreshing={refreshingHealth}
        onRefresh={handleRefreshHealth}
      />

      {/* Usage Statistics */}
      <PluginUsageStats stats={usageStats} />

      {/* Permissions */}
      <PluginPermissions
        permissions={plugin.manifest.permissions || []}
        grantedPermissions={plugin.grantedPermissions}
        onToggle={handleTogglePermission}
      />

      {/* Triggers */}
      {plugin.manifest.triggers && plugin.manifest.triggers.length > 0 && (
        <div className="detail-section">
          <h3>触发器</h3>
          <div className="triggers-list">
            {plugin.manifest.triggers.map((trigger: string) => (
              <code key={trigger} className="trigger-item">
                {trigger}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* User-defined Abbreviations */}
      <PluginAbbreviations
        pluginName={plugin.manifest.name}
        abbreviations={abbrState.abbreviations}
        newKeyword={abbrState.newAbbrKeyword}
        error={abbrState.abbrError}
        onKeywordChange={abbrState.handleKeywordChange}
        onAdd={abbrState.handleAdd}
        onRemove={abbrState.handleRemove}
        onToggle={abbrState.handleToggle}
      />

      {/* Metadata */}
      <PluginMetadata plugin={plugin} />
    </div>
  );
};

export default PluginDetailPanel;
