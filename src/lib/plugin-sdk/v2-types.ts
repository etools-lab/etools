/**
 * Plugin API v2 - Architecture with Worker-First Design
 *
 * Key Principles:
 * 1. Data computation in Worker (isolated, safe)
 * 2. Action execution in Main Thread (access to APIs)
 * 3. Communication via plain data (no functions)
 *
 * Base types (PluginManifest, PluginPermission, PluginSetting) are shared with v1.
 * See @/lib/plugin-sdk/types.ts for shared type definitions.
 */

import type { PluginManifest, PluginPermission, PluginSetting } from './types';

/**
 * Plugin action data - serializable data returned by onSearch
 * This data can be safely cloned via postMessage
 */
export interface PluginActionData {
  /** Action type determines how main thread should execute */
  type: 'popup' | 'clipboard' | 'open-url' | 'custom' | 'none' | 'open-ui';

  /** Human-readable action description */
  description?: string;

  /** For 'open-ui' type - plugin ID */
  pluginId?: string;

  /** For 'open-ui' type - tool ID within plugin */
  toolId?: string;

  /** For 'open-ui' type - query string to pass to UI */
  query?: string;

  /** Data for different action types */
  data?: {
    // For 'popup' type
    popup?: {
      title: string;
      message: string;
      icon?: string;
      style?: 'info' | 'success' | 'warning' | 'error';
      buttons?: Array<{
        label: string;
        value: string;
        isPrimary?: boolean;
      }>;
    };

    // For 'clipboard' type
    clipboard?: {
      text: string;
      type?: 'text' | 'image';
    };

    // For 'open-url' type
    url?: {
      href: string;
      target?: '_self' | '_blank';
    };

    // For 'custom' type - arbitrary serializable data
    custom?: Record<string, unknown>;
  };

  /** Optional metadata */
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Plugin search result (v2) - without action function
 * The action function is created on main thread based on actionData
 */
export interface PluginSearchResultV2 {
  /** Unique result ID */
  id: string;

  /** Display title */
  title: string;

  /** Description/subtitle */
  description?: string;

  /** Icon (emoji or URL) */
  icon?: string;

  /** Action data (serializable, no functions) */
  actionData: PluginActionData;

  /** Relevance score (0-1) */
  score?: number;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Plugin interface (v2)
 * onSearch returns PluginSearchResultV2[] (without action functions)
 */
export interface PluginV2 {
  manifest: PluginManifest;
  onSearch(query: string): Promise<PluginSearchResultV2[]>;
  init?(): Promise<void>;
  onDestroy?(): Promise<void>;
}

/**
 * Action executor - runs on main thread based on actionData
 * This is implemented by framework, not by plugins
 */
export interface ActionExecutor {
  execute(actionData: PluginActionData): Promise<void>;
}

/**
 * Worker execution result
 */
export interface WorkerExecutionResult {
  success: boolean;
  results: PluginSearchResultV2[];
  error?: string;
  executionTime: number;
}
