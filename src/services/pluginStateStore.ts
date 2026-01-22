/**
 * Plugin State Store
 * React Context + useReducer global state management for plugin system
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type {
  Plugin,
  MarketplacePlugin,
  PluginManagerState,
  PluginManagerAction,
  PluginFilters,
  BulkOperation,
} from '../types/plugin';

/**
 * Initial state for plugin manager
 */
const initialState: PluginManagerState = {
  // Core data
  plugins: [],
  marketplacePlugins: [],

  // UI state
  currentView: 'installed',
  selectedPluginIds: new Set(),
  detailPanelPluginId: null,

  // Filter and search
  searchQuery: '',
  statusFilter: 'all',
  categoryFilter: 'all',

  // Loading state
  loading: false,
  error: null,

  // Bulk operations
  bulkOperation: null,

  // Notifications
  notifications: [],

  // Plugin list version for cache invalidation
  pluginListVersion: 0,
};

/**
 * Reducer for plugin state management
 */
function pluginReducer(
  state: PluginManagerState,
  action: PluginManagerAction
): PluginManagerState {
  switch (action.type) {
    // === Data loading ===
    case 'LOAD_PLUGINS_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOAD_PLUGINS_SUCCESS':
      return {
        ...state,
        plugins: action.payload,
        loading: false,
        error: null,
      };

    case 'LOAD_PLUGINS_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // === Plugin operations ===
    case 'ENABLE_PLUGIN': {
      const pluginId = action.payload;
      const updatedPlugins = state.plugins.map((p) =>
        p.manifest.id === pluginId ? { ...p, enabled: !p.enabled } : p
      );
      return {
        ...state,
        plugins: updatedPlugins,
      };
    }

    case 'DISABLE_PLUGIN': {
      const pluginId = action.payload;
      const updatedPlugins = state.plugins.map((p) =>
        p.manifest.id === pluginId ? { ...p, enabled: false } : p
      );
      return {
        ...state,
        plugins: updatedPlugins,
      };
    }

    case 'UNINSTALL_PLUGIN': {
      const pluginId = action.payload;
      const updatedPlugins = state.plugins.filter((p) => p.manifest.id !== pluginId);
      return {
        ...state,
        plugins: updatedPlugins,
      };
    }

    // === Bulk operations ===
    case 'BULK_ENABLE_START':
      return {
        ...state,
        bulkOperation: {
          type: 'enable',
          targetPluginIds: action.payload,
          status: 'in_progress',
          results: [],
          startedAt: Date.now(),
        },
      };

    case 'BULK_ENABLE_PROGRESS':
      if (!state.bulkOperation) return state;
      return {
        ...state,
        bulkOperation: {
          ...state.bulkOperation,
          results: [
            ...(state.bulkOperation.results || []),
            {
              pluginId: action.payload.pluginId,
              success: action.payload.success,
              error: action.payload.success ? undefined : 'Operation failed',
            },
          ],
        },
      };

    case 'BULK_ENABLE_COMPLETE':
      return {
        ...state,
        bulkOperation: state.bulkOperation
          ? {
              ...state.bulkOperation,
              status: 'completed',
              completedAt: Date.now(),
            }
          : null,
      };

    // === Selection and filter ===
    case 'TOGGLE_SELECTION': {
      const newSelection = new Set(state.selectedPluginIds);
      if (newSelection.has(action.payload)) {
        newSelection.delete(action.payload);
      } else {
        newSelection.add(action.payload);
      }
      return {
        ...state,
        selectedPluginIds: newSelection,
      };
    }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedPluginIds: new Set(),
      };

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
        selectedPluginIds: new Set(),
      };

    case 'SET_STATUS_FILTER':
      return {
        ...state,
        statusFilter: action.payload,
        selectedPluginIds: new Set(),
      };

    case 'SET_CATEGORY_FILTER':
      return {
        ...state,
        categoryFilter: action.payload,
        selectedPluginIds: new Set(),
      };

    // === UI state ===
    case 'SET_VIEW':
      return {
        ...state,
        currentView: action.payload,
        selectedPluginIds: new Set(),
      };

    case 'SHOW_DETAILS':
      return {
        ...state,
        detailPanelPluginId: action.payload,
      };

    case 'HIDE_DETAILS':
      return {
        ...state,
        detailPanelPluginId: null,
      };

    // === Notifications ===
    case 'SHOW_NOTIFICATION': {
      const notification = {
        id: Date.now().toString(),
        ...action.payload,
      };
      return {
        ...state,
        notifications: [notification, ...state.notifications].slice(0, 10),
      };
    }

    case 'DISMISS_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };

    case 'INCREMENT_PLUGIN_VERSION':
      return {
        ...state,
        pluginListVersion: state.pluginListVersion + 1,
      };

    default:
      return state;
  }
}

/**
 * Context type
 */
interface PluginStateContextType {
  state: PluginManagerState;
  dispatch: React.Dispatch<PluginManagerAction>;
}

/**
 * Create context
 */
const PluginStateContext = createContext<PluginStateContextType | undefined>(
  undefined
);

/**
 * Provider props
 */
interface PluginStoreProviderProps {
  children: ReactNode;
}

/**
 * Plugin Store Provider component
 */
export function PluginStoreProvider({ children }: PluginStoreProviderProps) {
  const [state, dispatch] = useReducer(pluginReducer, initialState);

  return React.createElement(
    PluginStateContext.Provider,
    { value: { state, dispatch } },
    children
  );
}

/**
 * Get context - shared helper for all hooks
 */
function usePluginContext(): PluginStateContextType {
  const context = useContext(PluginStateContext);
  if (!context) {
    throw new Error('usePlugin* hooks must be used within PluginStoreProvider');
  }
  return context;
}

/**
 * Hook to access plugin state
 */
export function usePluginState(): PluginManagerState {
  return usePluginContext().state;
}

/**
 * Hook to access dispatch function
 */
export function usePluginDispatch(): React.Dispatch<PluginManagerAction> {
  return usePluginContext().dispatch;
}

/**
 * Hook to access both state and dispatch
 */
export function usePluginStore(): PluginStateContextType {
  return usePluginContext();
}

/**
 * Selector hooks for common state slices
 */

export function usePlugins(): Plugin[] {
  return usePluginState().plugins;
}

export function useMarketplacePlugins(): MarketplacePlugin[] {
  return usePluginState().marketplacePlugins;
}

export function useSelectedPluginIds(): Set<string> {
  return usePluginState().selectedPluginIds;
}

export function useIsLoading(): boolean {
  return usePluginState().loading;
}
