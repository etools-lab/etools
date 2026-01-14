/**
 * Plugin Settings Panel (T112-T114)
 * Manages plugin permissions, settings, and lifecycle
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { pluginLoader } from '@/services/pluginLoader';
import type { PluginManifest } from '@/lib/plugin-sdk/types';
import { invoke } from '@tauri-apps/api/core';
import './PluginSettingsPanel.css';

interface PluginSettingsPanelProps {
  className?: string;
}

// Permission descriptions
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'clipboard:read': '读取剪贴板内容',
  'clipboard:write': '写入剪贴板内容',
  'fs:read': '读取本地文件',
  'fs:write': '写入本地文件',
  'http:request': '发起网络请求',
  'shell:exec': '执行系统命令',
  'shell:open': '打开文件/URL',
  'notify': '显示系统通知',
};

function PluginSettingsPanel({ className = '' }: PluginSettingsPanelProps) {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginManifest | null>(null);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [pluginSettings, setPluginSettings] = useState<Record<string, Record<string, unknown>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load plugins on mount
  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all manifests
      const manifests = pluginLoader.getAllManifests();
      setPlugins(manifests);

      // Load permissions for each plugin
      const perms: Record<string, string[]> = {};
      const settings: Record<string, Record<string, unknown>> = {};

      for (const manifest of manifests) {
        try {
          const result = await invoke<{
            permissions: string[];
            settings: Record<string, unknown>;
          }>('get_plugin_permissions', { pluginId: manifest.id });
          perms[manifest.id] = result.permissions;
          settings[manifest.id] = result.settings;
        } catch (e) {
          // Use default permissions if command fails
          perms[manifest.id] = manifest.permissions;
          settings[manifest.id] = {};
        }
      }

      setPermissions(perms);
      setPluginSettings(settings);

      // Select first plugin if available
      if (manifests.length > 0 && !selectedPlugin) {
        setSelectedPlugin(manifests[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plugins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePermission = useCallback(async (pluginId: string, permission: string) => {
    try {
      const currentPerms = permissions[pluginId] || [];
      const hasPermission = currentPerms.includes(permission);

      if (hasPermission) {
        // Revoke permission
        await invoke('revoke_plugin_permission', { pluginId, permission });
        setPermissions(prev => ({
          ...prev,
          [pluginId]: currentPerms.filter(p => p !== permission),
        }));
      } else {
        // Grant permission
        await invoke('grant_plugin_permission', { pluginId, permission });
        setPermissions(prev => ({
          ...prev,
          [pluginId]: [...currentPerms, permission],
        }));
      }
    } catch (e) {
      console.error('Failed to toggle permission:', e);
      setError(e instanceof Error ? e.message : 'Failed to toggle permission');
    }
  }, [permissions]);

  const handleUpdateSetting = useCallback(async (pluginId: string, key: string, value: unknown) => {
    try {
      await invoke('set_plugin_setting', { pluginId, key, value });
      setPluginSettings(prev => ({
        ...prev,
        [pluginId]: {
          ...prev[pluginId],
          [key]: value,
        },
      }));
    } catch (e) {
      console.error('Failed to update setting:', e);
      setError(e instanceof Error ? e.message : 'Failed to update setting');
    }
  }, []);

  const handleUnloadPlugin = useCallback(async (pluginId: string) => {
    try {
      await pluginLoader.unloadPlugin(pluginId);
      await loadPlugins();
      if (selectedPlugin?.id === pluginId) {
        setSelectedPlugin(null);
      }
    } catch (e) {
      console.error('Failed to unload plugin:', e);
      setError(e instanceof Error ? e.message : 'Failed to unload plugin');
    }
  }, [selectedPlugin, loadPlugins]);

  if (isLoading) {
    return (
      <div className={`plugin-settings-panel plugin-settings-panel--loading ${className}`}>
        <div className="plugin-settings-panel__loader">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`plugin-settings-panel plugin-settings-panel--error ${className}`}>
        <div className="plugin-settings-panel__error">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={loadPlugins}>重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`plugin-settings-panel ${className}`}>
      {/* Plugin List */}
      <div className="plugin-settings-panel__sidebar">
        <h3 className="plugin-settings-panel__sidebar-title">
          已安装插件 ({plugins.length})
        </h3>

        {plugins.length === 0 ? (
          <div className="plugin-settings-panel__empty">
            暂无已安装的插件
          </div>
        ) : (
          <ul className="plugin-settings-panel__list">
            {plugins.map((plugin) => (
              <li
                key={plugin.id}
                className={`plugin-settings-panel__item ${
                  selectedPlugin?.id === plugin.id ? 'plugin-settings-panel__item--active' : ''
                }`}
                onClick={() => setSelectedPlugin(plugin)}
              >
                <div className="plugin-settings-panel__item-icon">
                  {plugin.icon || '🔌'}
                </div>
                <div className="plugin-settings-panel__item-info">
                  <div className="plugin-settings-panel__item-name">{plugin.name}</div>
                  <div className="plugin-settings-panel__item-version">v{plugin.version}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Plugin Details */}
      <div className="plugin-settings-panel__content">
        {selectedPlugin ? (
          <>
            <div className="plugin-settings-panel__header">
              <div className="plugin-settings-panel__header-icon">
                {selectedPlugin.icon || '🔌'}
              </div>
              <div className="plugin-settings-panel__header-info">
                <h2 className="plugin-settings-panel__header-title">{selectedPlugin.name}</h2>
                <p className="plugin-settings-panel__header-version">
                  版本 {selectedPlugin.version} · 作者 {selectedPlugin.author}
                </p>
                <p className="plugin-settings-panel__header-description">
                  {selectedPlugin.description}
                </p>
              </div>
              <button
                className="plugin-settings-panel__unload-btn"
                onClick={() => handleUnloadPlugin(selectedPlugin.id)}
              >
                卸载
              </button>
            </div>

            {/* Permissions */}
            <section className="plugin-settings-panel__section">
              <h3 className="plugin-settings-panel__section-title">权限</h3>

              {selectedPlugin.permissions.length === 0 ? (
                <div className="plugin-settings-panel__section-empty">
                  此插件不需要任何权限
                </div>
              ) : (
                <div className="plugin-settings-panel__permissions">
                  {selectedPlugin.permissions.map((permission) => {
                    const granted = permissions[selectedPlugin.id]?.includes(permission);
                    return (
                      <div
                        key={permission}
                        className="plugin-settings-panel__permission"
                      >
                        <label className="plugin-settings-panel__permission-label">
                          <input
                            type="checkbox"
                            checked={granted}
                            onChange={() => handleTogglePermission(selectedPlugin.id, permission)}
                          />
                          <span className="plugin-settings-panel__permission-name">
                            {permission}
                          </span>
                        </label>
                        <span className="plugin-settings-panel__permission-desc">
                          {PERMISSION_DESCRIPTIONS[permission] || '自定义权限'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Triggers */}
            {selectedPlugin.triggers.length > 0 && (
              <section className="plugin-settings-panel__section">
                <h3 className="plugin-settings-panel__section-title">触发器</h3>
                <div className="plugin-settings-panel__triggers">
                  {selectedPlugin.triggers.map((trigger) => (
                    <code key={trigger} className="plugin-settings-panel__trigger">
                      {trigger}
                    </code>
                  ))}
                </div>
              </section>
            )}

            {/* Plugin Settings */}
            <section className="plugin-settings-panel__section">
              <h3 className="plugin-settings-panel__section-title">设置</h3>

              {Object.keys(pluginSettings[selectedPlugin.id] || {}).length === 0 ? (
                <div className="plugin-settings-panel__section-empty">
                  此插件没有可配置的设置
                </div>
              ) : (
                <div className="plugin-settings-panel__settings">
                  {Object.entries(pluginSettings[selectedPlugin.id] || {}).map(([key, value]) => (
                    <div key={key} className="plugin-settings-panel__setting">
                      <label className="plugin-settings-panel__setting-label">{key}</label>
                      <input
                        type="text"
                        className="plugin-settings-panel__setting-input"
                        value={String(value)}
                        onChange={(e) => handleUpdateSetting(selectedPlugin.id, key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="plugin-settings-panel__placeholder">
            <div className="plugin-settings-panel__placeholder-icon">🔌</div>
            <p>选择一个插件查看详情</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PluginSettingsPanel);
