/**
 * MarketplaceView Component
 * Browse and install plugins from marketplace
 * 使用静态 JSON 数据源
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePluginState, usePluginDispatch } from '../../services/pluginStateStore';
import { marketplaceDataService } from '../../services/marketplaceData';
import { pluginManagerService } from '../../services/pluginManager';
import type { MarketplacePlugin, PluginCategory } from '../../types/plugin';
import './MarketplaceView.css';

/**
 * 分类信息接口
 */
interface CategoryInfo {
  key: string;
  name: string;
  icon: string;
}

/**
 * MarketplaceView - Plugin marketplace interface
 */
const MarketplaceView: React.FC = () => {
  const dispatch = usePluginDispatch();
  const state = usePluginState();

  // Local state
  const [allPlugins, setAllPlugins] = useState<MarketplacePlugin[]>([]);
  const [displayedPlugins, setDisplayedPlugins] = useState<MarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [installingPluginName, setInstallingPluginName] = useState<string | null>(null);
  const [installedPluginNames, setInstalledPluginNames] = useState<Set<string>>(new Set());

  const categories: CategoryInfo[] = useMemo(() => [
    { key: 'all', name: '全部', icon: '📦' },
    { key: 'productivity', name: '生产力', icon: '⚡' },
    { key: 'developer', name: '开发', icon: '💻' },
    { key: 'utilities', name: '工具', icon: '🔧' },
  ], []);

  /**
   * 加载所有插件
   */
  const loadMarketplacePlugins = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Marketplace] Loading plugins from static JSON...');
      const plugins = await marketplaceDataService.getAllPlugins();
      console.log(`[Marketplace] Loaded ${plugins.length} plugins`);

      setAllPlugins(plugins);
      setDisplayedPlugins(plugins);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Marketplace] Failed to load plugins:', err);
      setError(errorMessage);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'error',
          title: '加载失败',
          message: `无法加载插件市场: ${errorMessage}`,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  /**
   * 加载已安装插件列表
   */
  const loadInstalledPlugins = useCallback(async () => {
    try {
      const installedPlugins = await pluginManagerService.getInstalledPlugins();
      // 使用 name (显示名称) 而不是 entry_point (npm 包名) 来匹配
      const installedNames = new Set(installedPlugins.map((p) => p.name));
      setInstalledPluginNames(installedNames);
      console.log(`[Marketplace] Found ${installedNames.size} installed plugins`);
    } catch (err) {
      console.error('[Marketplace] Failed to load installed plugins:', err);
    }
  }, []);

  /**
   * 初始加载
   */
  useEffect(() => {
    loadMarketplacePlugins();
    loadInstalledPlugins();
  }, [loadMarketplacePlugins, loadInstalledPlugins]);

  /**
   * 过滤插件（分类 + 搜索）
   */
  useEffect(() => {
    let filtered = allPlugins;

    // 分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // 搜索过滤（客户端）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.displayName.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.keywords.some((kw) => kw.toLowerCase().includes(query)) ||
        p.author.toLowerCase().includes(query)
      );
    }

    setDisplayedPlugins(filtered);
  }, [allPlugins, selectedCategory, searchQuery]);

  /**
   * 处理搜索
   */
  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  /**
   * 处理分类变化
   */
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery(''); // 切换分类时清空搜索
  };

  /**
   * 安装插件
   */
  const handleInstallPlugin = async (plugin: MarketplacePlugin) => {
    setInstallingPluginName(plugin.name);

    try {
      console.log(`[Marketplace] Installing plugin: ${plugin.name}`);

      await marketplaceDataService.installPlugin(plugin);

      // 安装成功后，重新加载插件加载器
      const { pluginLoader } = await import('../../services/pluginLoader');
      try {
        await pluginLoader.loadInstalledPlugins();
        console.log('[Marketplace] Plugins reloaded after installation');
      } catch (error) {
        console.error('[Marketplace] Failed to reload plugins:', error);
      }

      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'success',
          title: '安装成功',
          message: `${plugin.displayName} 已成功安装`,
        },
      });

      // 重新加载已安装插件列表
      await loadInstalledPlugins();

      // 刷新市场插件列表（更新安装状态）
      setAllPlugins((prev) =>
        prev.map((p) =>
          p.name === plugin.name ? { ...p, installed: true } : p
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Marketplace] Failed to install plugin:', err);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'error',
          title: '安装失败',
          message: `${plugin.displayName} 安装失败: ${errorMessage}`,
        },
      });
    } finally {
      setInstallingPluginName(null);
    }
  };

  /**
   * 检查插件是否已安装
   */
  const isPluginInstalled = (pluginName: string): boolean => {
    return installedPluginNames.has(pluginName);
  };

  return (
    <div className="marketplace-view">
      {/* Search and Filter Bar */}
      <div className="marketplace-header">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="搜索插件..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
            aria-label="搜索插件"
          />
        </div>

        <div className="category-filters">
          {categories.map((category) => (
            <button
              key={category.key}
              className={`category-filter ${
                selectedCategory === category.key ? 'active' : ''
              }`}
              onClick={() => handleCategoryChange(category.key)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      {!loading && displayedPlugins.length > 0 && (
        <div className="results-count">
          {searchQuery
            ? `搜索结果: ${displayedPlugins.length} 个`
            : `共 ${displayedPlugins.length} 个插件`
          }
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>正在加载插件...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-state">
          <p>❌ 加载失败: {error}</p>
          <button
            className="btn-secondary"
            onClick={() => {
              setError(null);
              loadMarketplacePlugins();
            }}
          >
            重试
          </button>
          <p className="error-hint">
            💡 提示：确保本地服务器正在运行（<code>cd marketplace-data && python -m http.server 8080</code>）
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && displayedPlugins.length === 0 && (
        <div className="empty-state">
          <p>{searchQuery ? '😕 未找到匹配的插件' : '📭 暂无插件'}</p>
          {searchQuery && (
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      {/* Plugin Grid */}
      {displayedPlugins.length > 0 && (
        <div className="marketplace-plugins">
          {displayedPlugins.map((plugin) => (
            <PluginCard
              key={plugin.name}
              plugin={plugin}
              installing={installingPluginName === plugin.name}
              installed={isPluginInstalled(plugin.name)}
              onInstall={handleInstallPlugin}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * PluginCard Component
 */
interface PluginCardProps {
  plugin: MarketplacePlugin;
  installing: boolean;
  installed: boolean;
  onInstall: (plugin: MarketplacePlugin) => void;
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin, installing, installed, onInstall }) => {
  const categoryInfo = useMemo(() => {
    return marketplaceDataService.getCategoryInfo(plugin.category);
  }, [plugin.category]);

  // 防御性检查，确保 categoryInfo 存在
  if (!categoryInfo) {
    console.error('[PluginCard] Category info not found for:', plugin.category);
    return null;
  }

  return (
    <div className={`plugin-card ${installed ? 'installed' : ''}`}>
      <div className="plugin-header">
        <div className="plugin-icon">
          {plugin.logo ? (
            <img src={plugin.logo} alt={plugin.displayName} />
          ) : (
            <div className="plugin-icon-placeholder">
              {plugin.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="plugin-info">
          <h3 className="plugin-name">{plugin.displayName}</h3>
          <div className="plugin-category-badge">
            <span className="category-icon">{categoryInfo.categoryIcon}</span>
            <span className="category-name">{categoryInfo.categoryName}</span>
          </div>
        </div>
      </div>

      <p className="plugin-description">{plugin.description}</p>

      <div className="plugin-footer">
        <span className="plugin-version">v{plugin.version}</span>
        {installed ? (
          <span className="installed-badge">✓ 已安装</span>
        ) : (
          <button
            className="install-btn"
            onClick={() => onInstall(plugin)}
            disabled={installing}
          >
            {installing ? '安装中...' : '安装'}
          </button>
        )}
        {plugin.homepage && (
          <a
            href={plugin.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-link"
            title="查看主页"
          >
            🔗
          </a>
        )}
      </div>
    </div>
  );
};

export default MarketplaceView;
