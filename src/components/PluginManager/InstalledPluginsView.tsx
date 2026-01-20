/**
 * InstalledPluginsView Component
 * Displays installed plugins with search and filter controls
 * ✅ 激进优化：使用内存缓存，立即返回
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePluginState, usePluginDispatch } from '../../services/pluginStateStore';
import { pluginManagerService } from '../../services/pluginManager';
import { marketplaceService } from '../../services/pluginManager';
import type { Plugin, PluginUpdateInfo } from '../../types/plugin';
import PluginList from './PluginList';
import BulkActionsToolbar from './BulkActionsToolbar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useDebounce } from '../../hooks/useDebounce';
import './InstalledPluginsView.css';

/**
 * InstalledPluginsView - View for managing installed plugins
 */
const InstalledPluginsView: React.FC = () => {
  const dispatch = usePluginDispatch();
  const state = usePluginState();

  // Local search state (synced with global state)
  const [searchInput, setSearchInput] = useState(state.searchQuery || '');
  const [categoryFilter, setCategoryFilter] = useState<string>(
    state.categoryFilter === 'all' ? '' : state.categoryFilter
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    state.statusFilter === 'all' ? '' : state.statusFilter
  );

  // Update checking state
  const [updateInfo, setUpdateInfo] = useState<PluginUpdateInfo[]>([]);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updatingPluginIds, setUpdatingPluginIds] = useState<Set<string>>(new Set());

  // Debounce search query for filtering
  const searchQuery = useDebounce(searchInput, 300);

  /**
   * Load installed plugins
   * ✅ 激进优化：直接使用内存缓存，几乎立即返回
   */
  const loadPlugins = useCallback(async () => {
    try {
      console.log('[InstalledPluginsView] Loading plugins...');
      dispatch({ type: 'LOAD_PLUGINS_START' });

      const startTime = performance.now();
      const installedPlugins = await pluginManagerService.getInstalledPlugins();
      const endTime = performance.now();

      console.log('[InstalledPluginsView] Plugins loaded in', (endTime - startTime).toFixed(2), 'ms');

      dispatch({ type: 'LOAD_PLUGINS_SUCCESS', payload: installedPlugins });
    } catch (error) {
      dispatch({
        type: 'LOAD_PLUGINS_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load plugins',
      });
    }
  }, [dispatch]);

  /**
   * Initial load - ✅ 立即加载，使用内存缓存
   */
  useEffect(() => {
    console.log('[InstalledPluginsView] Component mounted, loading plugins...');
    loadPlugins();

    // Cleanup on unmount
    return () => {
      console.log('[InstalledPluginsView] Component unmounted');
    };
  }, [loadPlugins]);

  /**
   * Handle search input change (immediate update, filtered uses debounced value)
   */
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    dispatch({ type: 'SET_SEARCH_QUERY', payload: value });
  };

  /**
   * Handle category filter change
   */
  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    const payload = category === '' ? 'all' : (category as any);
    dispatch({ type: 'SET_CATEGORY_FILTER', payload });
  };

  /**
   * Handle status filter change
   */
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    const payload = status === '' ? 'all' : (status as any);
    dispatch({ type: 'SET_STATUS_FILTER', payload });
  };

  /**
   * Handle plugin toggle enable/disable
   */
  const handleToggleEnable = async (pluginId: string) => {
    try {
      const plugin = state.plugins.find((p) => p.manifest.id === pluginId);
      if (!plugin) return;

      if (plugin.enabled) {
        await pluginManagerService.disablePlugin(pluginId);
        dispatch({ type: 'DISABLE_PLUGIN', payload: pluginId });
      } else {
        await pluginManagerService.enablePlugin(pluginId);
        dispatch({ type: 'ENABLE_PLUGIN', payload: pluginId });
      }
    } catch (error) {
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'error',
          title: '操作失败',
          message: `Failed to toggle plugin: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    }
  };

  /**
   * Handle plugin uninstall
   */
  const handleUninstall = async (pluginId: string) => {
    console.log('[InstalledPluginsView] handleUninstall called for', pluginId);
    const plugin = state.plugins.find((p) => p.manifest.id === pluginId);
    if (!plugin) {
      console.log('[InstalledPluginsView] Plugin not found:', pluginId);
      return;
    }

      console.log('[InstalledPluginsView] Found plugin:', plugin.manifest.name);

      try {
        console.log('[InstalledPluginsView] Calling uninstallPlugin...');
        await pluginManagerService.uninstallPlugin(pluginId);

      // Unload plugin from PluginLoader to remove it from memory
      const { pluginLoader } = await import('../../services/pluginLoader');
      try {
        await pluginLoader.unloadPlugin(pluginId);
        console.log('[InstalledPluginsView] Plugin unloaded from memory');
      } catch (err) {
        console.warn('[InstalledPluginsView] Failed to unload plugin from memory:', err);
      }

      dispatch({ type: 'UNINSTALL_PLUGIN', payload: pluginId });
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'success',
          title: '卸载成功',
          message: `插件 "${plugin.manifest.name}" 已成功卸载`,
        },
      });
    } catch (error) {
      console.error('[InstalledPluginsView] Uninstall failed:', error);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'error',
          title: '卸载失败',
          message: `Failed to uninstall plugin: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    }
  };

  /**
   * Check for plugin updates
   */
  const handleCheckUpdates = async () => {
    try {
      console.log('[InstalledPluginsView] Checking for updates...');
      setCheckingUpdates(true);

      const updates = await marketplaceService.checkUpdates();
      console.log('[InstalledPluginsView] Found updates:', updates);

      setUpdateInfo(updates);

      // Update plugins with update information
      const updatedPlugins = state.plugins.map((plugin) => {
        const update = updates.find((u) => {
          // Match by package name (construct from plugin id)
          const packageName = `@etools-plugin/${plugin.manifest.id}`;
          return u.packageName === packageName;
        });

        if (update) {
          return {
            ...plugin,
            updateAvailable: true,
            latestVersion: update.latestVersion,
          };
        }
        return plugin;
      });

      dispatch({ type: 'LOAD_PLUGINS_SUCCESS', payload: updatedPlugins });

      // Show notification
      if (updates.length > 0) {
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: 'info',
            title: '发现更新',
            message: `发现 ${updates.length} 个插件有可用更新`,
          },
        });
      } else {
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: 'success',
            title: '检查完成',
            message: '所有插件都是最新版本',
          },
        });
      }
    } catch (error) {
      console.error('[InstalledPluginsView] Check updates failed:', error);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'error',
          title: '检查失败',
          message: `Failed to check updates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    } finally {
      setCheckingUpdates(false);
    }
  };

  /**
   * Handle plugin update
   */
  const handleUpdate = async (pluginId: string) => {
    const plugin = state.plugins.find((p) => p.manifest.id === pluginId);
    if (!plugin) return;

    try {
      console.log('[InstalledPluginsView] Updating plugin:', pluginId);
      setUpdatingPluginIds((prev) => new Set(prev).add(pluginId));

      // Get package name from update info
      const update = updateInfo.find((u) => u.packageName.endsWith(pluginId));
      if (!update) {
        throw new Error('Update information not found');
      }

      // Call marketplace update command
      await marketplaceService.updatePlugin(update.packageName);

      // Reload plugin from memory
      const { pluginLoader } = await import('../../services/pluginLoader');
      try {
        await pluginLoader.unloadPlugin(pluginId);
        await pluginLoader.loadPlugin(plugin);
      } catch (err) {
        console.warn('[InstalledPluginsView] Failed to reload plugin:', err);
      }

      // Reload plugins list
      await loadPlugins();

      // Clear update info for this plugin
      setUpdateInfo((prev) => prev.filter((u) => u.packageName !== update.packageName));

      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'success',
          title: '更新成功',
          message: `插件 "${plugin.manifest.name}" 已成功更新到 ${update.latestVersion}`,
        },
      });
    } catch (error) {
      console.error('[InstalledPluginsView] Update failed:', error);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'error',
          title: '更新失败',
          message: `Failed to update plugin: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    } finally {
      setUpdatingPluginIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pluginId);
        return newSet;
      });
    }
  };

  /**
   * Handle plugin selection (toggle)
   */
  const handleSelectPlugin = (pluginId: string) => {
    dispatch({ type: 'TOGGLE_SELECTION', payload: pluginId });
  };

  /**
   * Clear all selections
   */
  const handleClearSelection = () => {
    dispatch({ type: 'CLEAR_SELECTION' });
  };

  /**
   * Select all filtered plugins (manually toggle each)
   */
  const handleSelectAll = () => {
    filteredPlugins.forEach((plugin) => {
      if (!state.selectedPluginIds.has(plugin.manifest.id)) {
        dispatch({ type: 'TOGGLE_SELECTION', payload: plugin.manifest.id });
      }
    });
  };

  /**
   * Get filtered plugins - memoized to avoid unnecessary recalculation
   * Only recomputes when plugins, search query, or filters change
   */
    const filteredPlugins = useMemo(() => {
      return state.plugins.filter((plugin) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            plugin.manifest.name.toLowerCase().includes(query) ||
            plugin.manifest.description.toLowerCase().includes(query) ||
            plugin.manifest.id.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }

      // Category filter - Note: Plugin doesn't have category field
      // Skip category filter for installed plugins (MarketplacePlugin has category)
      // This can be added in future if Plugin interface is extended

      // Status filter
      if (statusFilter === 'enabled' && !plugin.enabled) return false;
      if (statusFilter === 'disabled' && plugin.enabled) return false;
      if (statusFilter === 'healthy' && plugin.health?.status !== 'healthy') {
        return false;
      }
      if (statusFilter === 'error' && plugin.health?.status !== 'error') {
        return false;
      }

      return true;
    });
  }, [state.plugins, searchQuery, statusFilter]);

  const selectedCount = state.selectedPluginIds.size;
  const filteredPluginIds = useMemo(
    () => filteredPlugins.map((p) => p.manifest.id),
    [filteredPlugins]
  );

  /**
   * Handle bulk operation complete - reload plugins
   */
  const handleOperationComplete = async () => {
    await loadPlugins();
  };

  /**
   * Keyboard shortcuts configuration
   */
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'a',
        metaKey: true,
        handler: handleSelectAll,
        description: '全选插件',
      },
      {
        key: 'a',
        metaKey: true,
        shiftKey: true,
        handler: handleClearSelection,
        description: '取消选择',
      },
      {
        key: 'Escape',
        handler: handleClearSelection,
        description: '清除选择',
      },
      {
        key: '/',
        metaKey: true,
        handler: () => {
          // Focus search input
          const searchInput = document.querySelector('.search-input') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        },
        description: '聚焦搜索框',
      },
    ],
    enabled: filteredPlugins.length > 0,
  });

  return (
    <div className="installed-plugins-view">
      {/* Search and Filter Bar */}
      <div className="plugins-filter-bar">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="搜索插件..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
            aria-label="搜索插件"
          />
        </div>

        <div className="filter-group">
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="filter-select"
            aria-label="按类别筛选"
          >
            <option value="">所有类别</option>
            <option value="productivity">生产力</option>
            <option value="developer">开发者</option>
            <option value="utilities">工具</option>
            <option value="search">搜索</option>
            <option value="media">媒体</option>
            <option value="integration">集成</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="filter-select"
            aria-label="按状态筛选"
          >
            <option value="">所有状态</option>
            <option value="enabled">已启用</option>
            <option value="disabled">已禁用</option>
            <option value="healthy">健康</option>
            <option value="error">错误</option>
          </select>

          <button
            className="btn-check-updates"
            onClick={handleCheckUpdates}
            disabled={checkingUpdates}
            aria-label="检查更新"
            title="检查所有插件的更新"
          >
            {checkingUpdates ? '检查中...' : '检查更新'}
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        totalFiltered={filteredPlugins.length}
        filteredPluginIds={filteredPluginIds}
        onOperationComplete={handleOperationComplete}
      />

      {/* Plugin List */}
      <PluginList
        plugins={filteredPlugins}
        selectedIds={state.selectedPluginIds}
        loading={state.loading}
        searchQuery={searchQuery}
        selectionMode={selectedCount > 0}
        onToggleSelect={handleSelectPlugin}
        onToggleEnable={handleToggleEnable}
        onUninstall={handleUninstall}
        onUpdate={handleUpdate}
        onPluginClick={(plugin) => {
          dispatch({ type: 'SHOW_DETAILS', payload: plugin.manifest.id });
        }}
      />

      {/* Empty State */}
      {!state.loading && filteredPlugins.length === 0 && state.plugins.length > 0 && (
        <div className="empty-state">
          <p>未找到匹配的插件</p>
          <button
            className="btn-secondary"
            onClick={() => {
              handleSearchChange('');
              handleCategoryChange('');
              handleStatusChange('');
            }}
          >
            清除筛选
          </button>
        </div>
      )}

      {/* No Plugins State */}
      {!state.loading && state.plugins.length === 0 && (
        <div className="empty-state">
          <p>尚未安装任何插件</p>
          <p className="text-muted">插件可以通过手动安装到插件目录来添加</p>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className="error-state">
          <p>加载插件失败: {state.error}</p>
          <button className="btn-secondary" onClick={loadPlugins}>
            重试
          </button>
        </div>
      )}
    </div>
  );
};

export default InstalledPluginsView;
