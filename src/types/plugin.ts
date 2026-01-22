/**
 * Plugin Types (v2)
 * Type definitions for plugin system
 *
 * This file extends base SDK types (from @/lib/plugin-sdk/types)
 * with runtime state and application-specific fields.
 *
 * All plugins use v2 API:
 * - PluginSearchResult with actionData (no action functions)
 * - onSearch returns PluginSearchResultV2[]
 *
 * Uses ETP (etools Plugin Metadata Protocol) for strict validation
 */

// Import and re-export base types from plugin-sdk (v2)
export type {
  PluginManifest,
  PluginPermission,
  PluginContext,
  Plugin as SDKPlugin,
  PluginSDK
} from '@/lib/plugin-sdk/types';

// Import v2 types
export type {
  PluginSearchResultV2,
  PluginActionData,
  PluginV2,
  ActionExecutor,
  WorkerExecutionResult
} from '@/lib/plugin-sdk/v2-types';

// ============================================================================
// ETP - etools Plugin Metadata Protocol
// ============================================================================

/**
 * etools 插件元数据协议（ETP）
 * 所有插件必须在 package.json 中包含 etools 字段
 */
export interface EtoolsMetadata {
  /** 插件唯一标识符（不含 @etools-plugin/ 前缀） */
  id: string;

  /** 显示名称（UI 使用，必须友好可读） */
  displayName: string;

  /** 详细描述（可选，优先使用此字段而非 package.json#description） */
  description?: string;

  /** 分类（必填） */
  category: PluginCategory;

  /** 图标路径（可选，相对于包根目录） */
  icon?: string;

  /** 项目主页 URL（可选） */
  homepage?: string;

  /** 截图 URL 列表（可选） */
  screenshots?: string[];

  /** 所需权限列表（必填） */
  permissions: string[];

  /** 触发关键词列表（必填） */
  triggers: string[];

  /** 配置项定义（可选） */
  settings?: PluginSetting[];
}

/**
 * ETP 元数据解析错误
 */
export class EtoolsMetadataError extends Error {
  constructor(
    public code: 'MISSING_ETOOLS_FIELD' | 'MISSING_REQUIRED_FIELD' | 'INVALID_CATEGORY' | 'INVALID_PACKAGE_NAME',
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'EtoolsMetadataError';
  }
}

// ============================================================================
// Extended Plugin Types (with runtime state)
// ============================================================================

/**
 * Plugin health status
 */
export type PluginHealthStatus = 'healthy' | 'warning' | 'error' | 'unknown';

/**
 * Plugin setting definition
 */
export interface PluginSetting {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  default: string | number | boolean;
  options?: { label: string; value: string | number }[];
  description?: string;
}

// ============================================================================
// Installation Types
// ============================================================================

/**
 * Plugin installation source
 */
export type PluginSource = 'marketplace' | 'local' | 'github-release';

/**
 * Plugin installation progress
 */
export type InstallProgress = {
  installId: string;
  stage: 'validating' | 'extracting' | 'installing' | 'complete' | 'error' | 'cancelled';
  progress: number; // 0-100
  message: string;
  error?: string;
};

/**
 * Package validation result
 */
export type PackageValidation = {
  isValid: boolean;
  manifest: PluginManifest | null;
  errors: ValidationError[];
  warnings: ValidationWarning[];
};

/**
 * Extraction result
 */
export type ExtractionResult = {
  path: string;
  manifest: PluginManifest;
  files: ExtractedFile[];
};

/**
 * Cancel installation response
 */
export type CancelInstallResponse = {
  success: boolean;
  message: string;
  cleanupRequired: boolean;
};

/**
 * Validation error
 */
export type ValidationError = {
  code: string;
  message: string;
  field: string | undefined;
};

/**
 * Validation warning
 */
export type ValidationWarning = {
  code: string;
  message: string;
  field: string | undefined;
};

/**
 * Extracted file information
 */
export type ExtractedFile = {
  path: string;
  size: number; // File size in bytes
  file_type: string; // "file" or "directory"
};

/**
 * Plugin health information
 */
export interface PluginHealth {
  status: PluginHealthStatus;
  message?: string;
  lastChecked: number; // timestamp (ms)
  errors?: PluginError[];
}

/**
 * Plugin error details
 */
export interface PluginError {
  code: string;
  message: string;
  timestamp: number; // timestamp (ms)
  context?: Record<string, unknown>;
}

/**
 * Plugin usage statistics
 */
export interface PluginUsageStats {
  lastUsed: number | null; // timestamp (ms)
  usageCount: number;
  lastExecutionTime?: number; // ms
  averageExecutionTime?: number; // ms
}

/**
 * Plugin abbreviation configuration (user-defined shortcuts)
 */
export interface PluginAbbreviation {
  keyword: string; // The abbreviation keyword (e.g., "hw" for hello-world)
  enabled: boolean;
}

/**
 * Extended Plugin interface with runtime state (v2)
 * Extends SDKPlugin with runtime state fields
 *
 * v2 Plugin must implement onSearch returning PluginSearchResultV2[]
 */
export interface Plugin extends Omit<SDKPlugin, 'manifest'> {
  // === Shared with SDK Plugin ===
  manifest: PluginManifest;

  // === v2 specific: onSearch returns PluginSearchResultV2[] ===
  onSearch(query: string): Promise<PluginSearchResultV2[]>;

  // === Runtime state (added by plugin manager) ===
  enabled?: boolean;
  health?: PluginHealth;
  usageStats?: PluginUsageStats;
  installedAt?: number; // timestamp (ms)
  grantedPermissions?: Set<PluginPermission>;
  configValues?: Record<string, string | number | boolean>;

  // === User-defined abbreviations (custom shortcuts for quick search) ===
  abbreviations?: PluginAbbreviation[];

  // === Update information (for marketplace plugins) ===
  updateAvailable?: boolean;           // Whether an update is available
  latestVersion?: string;              // Latest version from npm
  packageName?: string;               // npm package name (e.g., "@etools-plugin/devtools")
}

// ============================================================================
// Marketplace Plugin Types
// ============================================================================

/**
 * Plugin category
 */
export type PluginCategory =
  | 'productivity'
  | 'developer'
  | 'utilities'
  | 'search'
  | 'media'
  | 'integration';

/**
 * Marketplace plugin（使用 ETP 协议）
 * 从后端转换而来，用于前端展示
 */
export interface MarketplacePlugin {
  // 基本信息
  name: string;                  // npm 包名，如 "@etools-plugin/hello"
  displayName: string;           // 显示名称（ETP 协议的 etools.displayName）
  description: string;           // 简短描述
  logo: string;                  // 图标 URL

  // 作者信息
  author: string;                // 作者名称
  homepage?: string;             // 项目主页 URL

  // 版本和下载
  version: string;               // 最新版本号
  downloads?: number;            // 下载次数（可选）

  // 功能说明
  features: string[];            // 功能特性列表
  keywords: string[];            // 搜索关键词

  // 截图和文档
  screenshots?: string[];        // 截图 URL 列表（可选）
  readme?: string;               // README URL（可选）

  // 分类
  category: PluginCategory;      // 插件分类（ETP 协议的 etools.category）
  tags?: string[];               // 标签（可选）

  // 系统要求
  permissions: string[];         // 所需权限（ETP 协议的 etools.permissions）
  platform?: string[];           // 支持平台（可选）

  // 安装信息
  isDev?: boolean;               // 是否为开发插件（默认 false）
  core?: boolean;                // 是否为核心插件（默认 false）

  // UI 状态字段（非 JSON 数据，前端维护）
  installed?: boolean;           // 是否已安装（前端字段）
  installing?: boolean;          // 是否正在安装（前端字段）
}

// ============================================================================
// Bulk Operation Types
// ============================================================================

/**
 * Bulk operation type
 */
export type BulkOperationType =
  | 'enable'
  | 'disable'
  | 'uninstall'
  | 'update';

/**
 * Bulk operation status
 */
export type BulkOperationStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'partial_failure'
  | 'failed';

/**
 * Bulk operation
 */
export interface BulkOperation {
  type: BulkOperationType;
  targetPluginIds: string[];
  status: BulkOperationStatus;
  results: BulkOperationResult[];
  startedAt: number; // timestamp (ms)
  completedAt?: number; // timestamp (ms)
}

/**
 * Bulk operation result for a single plugin
 */
export interface BulkOperationResult {
  pluginId: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Plugin Update Types
// ============================================================================

/**
 * Plugin update information
 */
export interface PluginUpdateInfo {
  packageName: string;       // npm package name (e.g., "@etools-plugin/devtools")
  currentVersion: string;    // Currently installed version
  latestVersion: string;     // Latest version from npm
  hasUpdate: boolean;        // Whether an update is available
}

// ============================================================================
// State Management Types
// ============================================================================

/**
 * Plugin notification type
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Plugin notification
 */
export interface PluginNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // ms
}

/**
 * Plugin manager state (global state)
 */
export interface PluginManagerState {
  // === Core data ===
  plugins: Plugin[];
  marketplacePlugins: MarketplacePlugin[];

  // === UI state ===
  currentView: 'installed' | 'marketplace' | 'install';
  selectedPluginIds: Set<string>;
  detailPanelPluginId: string | null;

  // === Filter and search ===
  searchQuery: string;
  statusFilter: 'all' | 'enabled' | 'disabled';
  categoryFilter: PluginCategory | 'all';

  // === Loading state ===
  loading: boolean;
  error: string | null;

  // === Bulk operations ===
  bulkOperation: BulkOperation | null;

  // === Notifications ===
  notifications: PluginNotification[];

  // === Cache invalidation ===
  pluginListVersion: number;
}

/**
 * Plugin manager action type
 */
export type PluginManagerAction =
  // === Data loading ===
  | { type: 'LOAD_PLUGINS_START' }
  | { type: 'LOAD_PLUGINS_SUCCESS'; payload: Plugin[] }
  | { type: 'LOAD_PLUGINS_ERROR'; payload: string }

  // === Plugin operations ===
  | { type: 'ENABLE_PLUGIN'; payload: string }
  | { type: 'DISABLE_PLUGIN'; payload: string }
  | { type: 'UNINSTALL_PLUGIN'; payload: string }

  // === Bulk operations ===
  | { type: 'BULK_ENABLE_START'; payload: string[] }
  | { type: 'BULK_ENABLE_PROGRESS'; payload: { pluginId: string; success: boolean } }
  | { type: 'BULK_ENABLE_COMPLETE' }

  // === Selection and filter ===
  | { type: 'TOGGLE_SELECTION'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: PluginManagerState['statusFilter'] }
  | { type: 'SET_CATEGORY_FILTER'; payload: PluginManagerState['categoryFilter'] }

  // === UI state ===
  | { type: 'SET_VIEW'; payload: PluginManagerState['currentView'] }
  | { type: 'SHOW_DETAILS'; payload: string }
  | { type: 'HIDE_DETAILS' }

  // === Notifications ===
  | { type: 'SHOW_NOTIFICATION'; payload: Omit<PluginNotification, 'id'> }
  | { type: 'DISMISS_NOTIFICATION'; payload: string }

  // === Cache invalidation ===
  | { type: 'INCREMENT_PLUGIN_VERSION' };

// ============================================================================
// Service Types
// ============================================================================

/**
 * Plugin filter options
 */
export interface PluginFilters {
  status?: 'all' | 'enabled' | 'disabled';
  health?: PluginHealthStatus;
  category?: PluginCategory;
}

/**
 * Marketplace query options
 */
export interface MarketplaceQueryOptions {
  category?: PluginCategory;
  page?: number; // starts from 1
  pageSize?: number; // default 20
  sortBy?: 'name' | 'rating' | 'downloads' | 'updated';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Marketplace search options
 */
export interface MarketplaceSearchOptions extends MarketplaceQueryOptions {
  searchIn?: ('name' | 'description' | 'author' | 'tags')[];
}
