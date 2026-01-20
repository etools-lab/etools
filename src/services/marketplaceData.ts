/**
 * Marketplace Data Service
 * 插件市场数据
 *
 * 说明：从 npm @etools-plugin 组织动态加载插件
 * 使用 ETP (etools Plugin Metadata Protocol) 严格验证
 */

import type { MarketplacePlugin, PluginCategory } from '../types/plugin';
import { marketplaceService } from './pluginManager';
import { PluginMetadataParser } from '../utils/pluginMetadataParser';

// ============================================================================
// 类型转换（使用 ETP 协议）
// ============================================================================

/**
 * 转换后端 MarketplacePlugin 到前端 MarketplacePlugin
 * 使用 ETP 协议，后端已经验证过元数据
 * Tauri 会自动将 snake_case 转换为 camelCase
 */
function convertBackendToFrontend(backend: any): MarketplacePlugin {
  // 如果 backend.icon 存在且非 null，使用它
  // 否则根据分类生成默认 emoji 图标
  let logo = backend.icon;
  if (!logo) {
    const categoryEmojis: Record<string, string> = {
      productivity: '⚡',
      developer: '🛠️',
      utilities: '🔧',
      search: '🔍',
      media: '🎬',
      integration: '🔗',
    };
    logo = categoryEmojis[backend.category] || '📦';
  }

  return {
    name: `@etools-plugin/${backend.id}`,      // npm 包名（后端已验证符合 @etools-plugin/* 格式）
    displayName: backend.name,                  // 显示名称（后端已从 ETP 解析）
    description: backend.description,
    logo,
    author: backend.author,
    homepage: backend.homepage || undefined,
    version: backend.latestVersion || backend.version,
    downloads: backend.downloadCount || backend.download_count || 0,
    features: (backend.tags || []).slice(0, 5),  // 从 tags 生成 features
    keywords: backend.tags || [],
    category: backend.category as PluginCategory,
    tags: backend.tags || [],
    permissions: backend.permissions || [],      // 后端已从 ETP 解析
    platform: undefined,
    screenshots: backend.screenshots || undefined,
  };
}

// ============================================================================
// 插件数据缓存
// ============================================================================

let pluginsCache: MarketplacePlugin[] | null = null;
let lastCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分钟缓存

// ============================================================================
// 导出的服务方法
// ============================================================================

/**
 * Marketplace Data Service
 * 从 NPM Registry 动态加载插件
 */
export const marketplaceDataService = {
  /**
   * 获取所有插件（从 NPM Registry）
   */
  async getAllPlugins(): Promise<MarketplacePlugin[]> {
    const now = Date.now();

    // 检查缓存
    if (pluginsCache && (now - lastCacheTime) < CACHE_DURATION) {
      console.log('[MarketplaceData] Using cached plugins');
      return pluginsCache;
    }

    try {
      console.log('[MarketplaceData] Fetching plugins from NPM Registry...');
      const result = await marketplaceService.getMarketplacePlugins();

      // 转换后端格式到前端格式
      const plugins = result.plugins.map(convertBackendToFrontend);

      // 更新缓存
      pluginsCache = plugins;
      lastCacheTime = now;

      console.log(`[MarketplaceData] Loaded ${plugins.length} plugins from NPM`);
      return plugins;
    } catch (error) {
      console.error('[MarketplaceData] Failed to fetch from NPM:', error);
      // 如果缓存存在，返回缓存
      if (pluginsCache) {
        console.log('[MarketplaceData] Falling back to cached plugins');
        return pluginsCache;
      }
      throw error;
    }
  },

  /**
   * 获取所有分类的插件
   */
  async getAllCategories(): Promise<Record<string, MarketplacePlugin[]>> {
    const allPlugins = await this.getAllPlugins();

    const categorized: Record<string, MarketplacePlugin[]> = {
      all: allPlugins,
      productivity: [],
      developer: [],
      utilities: [],
      search: [],
      media: [],
      integration: [],
    };

    for (const plugin of allPlugins) {
      const category = plugin.category || 'utilities';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(plugin);
    }

    return categorized;
  },

  /**
   * 获取指定分类的插件
   */
  async getCategoryPlugins(category: string): Promise<MarketplacePlugin[]> {
    if (category === 'all') {
      return this.getAllPlugins();
    }

    const allPlugins = await this.getAllPlugins();
    return allPlugins.filter(p => p.category === category);
  },

  /**
   * 搜索插件（后端搜索）
   */
  async searchPlugins(query: string, options?: { category?: PluginCategory }): Promise<MarketplacePlugin[]> {
    try {
      console.log(`[MarketplaceData] Searching for: ${query}`);
      const result = await marketplaceService.searchMarketplace(query, options);

      // 转换后端格式到前端格式
      const plugins = result.plugins.map((p: any) => convertBackendToFrontend(p));

      console.log(`[MarketplaceData] Search returned ${plugins.length} plugins`);
      return plugins;
    } catch (error) {
      console.error('[MarketplaceData] Search failed:', error);
      throw error;
    }
  },

  /**
   * 获取分类元数据（名称、图标等）
   */
  getCategoryInfo(category: string): {
    categoryName: string;
    categoryIcon: string;
  } {
    const categoryMetadata: Record<string, { categoryName: string; categoryIcon: string }> = {
      all: { categoryName: '全部插件', categoryIcon: '📦' },
      productivity: { categoryName: '生产力', categoryIcon: '⚡' },
      developer: { categoryName: '开发工具', categoryIcon: '👨‍💻' },
      utilities: { categoryName: '实用工具', categoryIcon: '🔧' },
      search: { categoryName: '搜索增强', categoryIcon: '🔍' },
      media: { categoryName: '媒体处理', categoryIcon: '🎬' },
      integration: { categoryName: '第三方集成', categoryIcon: '🔗' },
    };

    return categoryMetadata[category] || { categoryName: category, categoryIcon: '📦' };
  },

  /**
   * 安装插件
   */
  async installPlugin(plugin: MarketplacePlugin): Promise<void> {
    // 使用 plugin.name (npm 包名) 作为 pluginId
    await marketplaceService.installPlugin(plugin.name);
  },

  /**
   * 检查插件是否已安装
   */
  async isInstalled(pluginName: string): Promise<boolean> {
    // 实际检查逻辑在 pluginManager.ts 中处理
    return false;
  },

  /**
   * 清除缓存
   */
  clearCache(): void {
    console.log('[MarketplaceData] Clearing cache');
    pluginsCache = null;
    lastCacheTime = 0;
  },
};

/**
 * 默认导出
 */
export default marketplaceDataService;
