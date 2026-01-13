/**
 * useSearch Hook - Manages search state and queries
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SearchResult } from '@/types/search';
import { getSearchService } from '@/services/searchService';
import { getActionService } from '@/services/actionService';
import { pluginLoader } from '@/services/pluginLoader';
import { abbreviationService } from '@/services/abbreviationService';
import { pluginAbbreviationService } from '@/services/pluginAbbreviationService';

// ============================================================================
// Types
// ============================================================================

interface SearchState {
  results: SearchResult[];
  query: string;
  selectedIndex: number;
  isLoading: boolean;
  error: string | null;
  clipboardMode: boolean;
}

interface UseSearchOptions {
  debounceMs?: number;
  maxResults?: number;
}

interface SearchContext {
  query: string;
  maxResults: number;
  searchService: ReturnType<typeof getSearchService>;
  actionService: ReturnType<typeof getActionService>;
}

// ============================================================================
// Search Source Handlers
// ============================================================================

/**
 * Search clipboard items (clip: trigger)
 */
async function searchClipboard(
  clipQuery: string,
  maxResults: number
): Promise<SearchResult[]> {
  try {
    const clipboardItems = await invoke<Array<{
      id: string;
      content: string;
      timestamp: number;
      is_sensitive: boolean;
    }>>('search_clipboard', {
      query: clipQuery,
      limit: maxResults,
    });

    return clipboardItems.map((item) => ({
      id: item.id,
      title: item.content.substring(0, 50) + (item.content.length > 50 ? '...' : ''),
      subtitle: new Date(item.timestamp).toLocaleString(),
      icon: '📋',
      type: 'clipboard' as const,
      score: 1,
      action: async () => {
        await invoke('paste_clipboard_item', { id: item.id });
      },
      metadata: {
        isSensitive: item.is_sensitive,
        fullContent: item.content,
      },
    }));
  } catch (e) {
    console.error('Clipboard search error:', e);
    return [];
  }
}

/**
 * Search using backend unified search
 */
async function searchUnified(
  query: string,
  maxResults: number
): Promise<SearchResult[]> {
  const response = await invoke<{
    results: Array<{
      id: string;
      title: string;
      subtitle: string;
      icon?: string;
      type: string;
      score: number;
      path: string;
      frequency: number;
    }>;
    total: number;
    query_time: number;
  }>('unified_search', {
    query: { query, limit: maxResults, sources: null },
  });

  return response.results.map(r => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    icon: r.icon,
    type: r.type as SearchResult['type'],
    score: r.score,
    path: r.path,
    action: async () => {
      await invoke('launch_app', { path: r.path });
    },
  }));
}

/**
 * Search files
 */
async function searchFiles(
  query: string,
  maxResults: number,
  searchService: ReturnType<typeof getSearchService>
): Promise<SearchResult[]> {
  try {
    const fileResults = await invoke<Array<{
      id: string;
      filename: string;
      path: string;
      extension: string | null;
      size: number;
      indexed: number;
    }>>('search_files', {
      query,
      limit: maxResults,
    });

    return fileResults.map((file) =>
      searchService.createFileResult(
        file.id,
        file.filename,
        file.path,
        file.extension || undefined,
        file.size
      )
    );
  } catch {
    return [];
  }
}

/**
 * Search browser bookmarks and history
 */
async function searchBrowser(
  query: string,
  maxResults: number,
  searchService: ReturnType<typeof getSearchService>
): Promise<SearchResult[]> {
  try {
    const browserResults = await invoke<Array<{
      id: string;
      title: string;
      url: string;
      browser: string;
      entry_type: string;
      favicon: string | null;
      last_visited: number;
    }>>('search_browser_data', {
      query,
      limit: maxResults,
    });

    return browserResults.map((item) =>
      searchService.createBrowserResult(
        item.id,
        item.title,
        item.url,
        item.browser,
        item.entry_type === 'bookmark' ? 'bookmark' : 'history',
        item.favicon || undefined
      )
    );
  } catch {
    return [];
  }
}

/**
 * Search abbreviations
 */
async function searchAbbreviations(query: string): Promise<{
  results: SearchResult[];
  shouldReturn: boolean;
}> {
  try {
    await abbreviationService.loadConfig();
    const abbrResults = abbreviationService.searchAbbreviations(query);

    const results: SearchResult[] = abbrResults.map((abbr) => {
      const category = abbreviationService.getCategoryById(abbr.category || '');
      return {
        id: `abbr-${abbr.id}`,
        title: `${abbr.abbr}: ${abbr.expansion}`,
        subtitle: abbr.description || `缩写展开为 ${abbr.expansion}`,
        icon: category?.icon || '🔗',
        type: 'plugin' as const,
        score: 0.95,
        action: async () => {
          await invoke('open_url', { url: abbr.expansion });
        },
      };
    });

    // Check for auto-open on colon
    if (query.endsWith(':')) {
      const abbrWithoutColon = query.slice(0, -1);
      const expansion = abbreviationService.expandAbbreviation(abbrWithoutColon);
      if (expansion) {
        const config = abbreviationService.getConfig();
        if (config?.autoOpenSingle) {
          await invoke('open_url', { url: expansion });
          return { results: [], shouldReturn: true };
        }
      }
    }

    return { results, shouldReturn: false };
  } catch (e) {
    console.error('Abbreviation search error:', e);
    return { results: [], shouldReturn: false };
  }
}

/**
 * Search plugin abbreviations (user-defined shortcuts)
 */
async function searchPluginAbbreviations(query: string): Promise<SearchResult[]> {
  try {
    await pluginAbbreviationService.loadConfig();
    const plugins = await pluginLoader.getAllPlugins();
    const abbrMatches = pluginAbbreviationService.searchPluginsByAbbreviation(query, plugins);

    if (abbrMatches.length === 0) return [];

    return abbrMatches.map(({ plugin, abbreviation, matchType }) => {
      const scoreByMatchType = { exact: 0.98, prefix: 0.96, contains: 0.94 };
      const score = scoreByMatchType[matchType];

      return {
        id: `plugin-abbr-${plugin.manifest.id}-${abbreviation.keyword}`,
        title: `${abbreviation.keyword}: ${plugin.manifest.name}`,
        subtitle: `触发插件${matchType === 'exact' ? ' (精确匹配)' : ''}`,
        icon: plugin.manifest.icon || '🔌',
        type: 'plugin' as const,
        score,
        action: async () => {
          const pluginResults = await pluginLoader.searchByTrigger(abbreviation.keyword);
          if (pluginResults.length > 0 && pluginResults[0].action) {
            await pluginResults[0].action();
          }
        },
      };
    });
  } catch (e) {
    console.error('Plugin abbreviation search error:', e);
    return [];
  }
}

/**
 * Search plugins
 */
async function searchPlugins(query: string): Promise<SearchResult[]> {
  try {
    const pluginResults = await pluginLoader.searchByTrigger(query);

    return pluginResults
      .filter(pr => pr.action)
      .map((pr) => ({
        id: pr.id,
        title: pr.title,
        subtitle: pr.description,
        icon: pr.icon,
        type: 'plugin' as const,
        score: 0.9,
        action: async () => {
          if (pr.action) {
            await pr.action();
          }
        },
      }));
  } catch (e) {
    console.error('[useSearch] Plugin search error:', e);
    return [];
  }
}

// ============================================================================
// Main Search Function
// ============================================================================

/**
 * Perform the main search across all sources
 */
async function performSearch(ctx: SearchContext): Promise<{
  results: SearchResult[];
  clipboardMode: boolean;
  shouldReturn?: boolean;
}> {
  const { query, maxResults, searchService, actionService } = ctx;

  // Check for clipboard trigger "clip:"
  const clipboardTrigger = query.match(/^clip:\s*(.*)$/i);
  if (clipboardTrigger) {
    const clipQuery = clipboardTrigger[1];
    const results = await searchClipboard(clipQuery, maxResults);
    return { results, clipboardMode: true };
  }

  // Check for quick actions (highest priority)
  const actionResult = actionService.detectAction(query);
  if (actionResult) {
    return { results: [actionResult], clipboardMode: false };
  }

  // Unified search from backend
  let searchResults = await searchUnified(query, maxResults);

  // Run file and browser searches in parallel
  const [fileResults, browserResults] = await Promise.all([
    searchFiles(query, Math.floor(maxResults / 3), searchService),
    searchBrowser(query, Math.floor(maxResults / 3), searchService),
  ]);

  searchResults = [...searchResults, ...fileResults, ...browserResults];

  // Re-rank combined results
  const rankedResults = searchService.search(searchResults, query, {
    limit: maxResults,
  });
  searchResults = rankedResults.results;

  // Search abbreviations
  const abbrResult = await searchAbbreviations(query);
  if (abbrResult.shouldReturn) {
    return { results: [], clipboardMode: false, shouldReturn: true };
  }
  searchResults = [...abbrResult.results, ...searchResults];

  // Search plugin abbreviations
  const pluginAbbrResults = await searchPluginAbbreviations(query);
  searchResults = [...pluginAbbrResults, ...searchResults];

  // Search plugins
  const pluginResults = await searchPlugins(query);
  searchResults = [...searchResults, ...pluginResults];

  return { results: searchResults, clipboardMode: false };
}

// ============================================================================
// Hook
// ============================================================================

export function useSearch(options: UseSearchOptions = {}) {
  const { debounceMs = 200, maxResults = 10 } = options;

  const [state, setState] = useState<SearchState>({
    results: [],
    query: '',
    selectedIndex: 0,
    isLoading: false,
    error: null,
    clipboardMode: false,
  });

  const searchService = getSearchService();
  const actionService = getActionService();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Perform search with debouncing
   */
  const search = useCallback(async (query: string) => {
    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Update query immediately for UI
    setState((prev) => ({ ...prev, query }));

    if (!query.trim()) {
      setState((prev) => ({
        ...prev,
        results: [],
        selectedIndex: 0,
        isLoading: false,
        clipboardMode: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // Debounce the search
    debounceRef.current = setTimeout(async () => {
      try {
        // Cancel any previous search
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const result = await performSearch({
          query,
          maxResults,
          searchService,
          actionService,
        });

        if (result.shouldReturn) {
          setState((prev) => ({
            ...prev,
            results: [],
            isLoading: false,
            selectedIndex: 0,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          results: result.results,
          clipboardMode: result.clipboardMode,
          selectedIndex: 0,
          isLoading: false,
        }));
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          setState((prev) => ({
            ...prev,
            error: error.message,
            isLoading: false,
          }));
        }
      }
    }, debounceMs);
  }, [debounceMs, maxResults, searchService, actionService]);

  /**
   * Select the next result
   */
  const selectNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIndex: Math.min(prev.selectedIndex + 1, prev.results.length - 1),
    }));
  }, []);

  /**
   * Select the previous result
   */
  const selectPrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIndex: Math.max(prev.selectedIndex - 1, 0),
    }));
  }, []);

  /**
   * Select a specific result by index
   */
  const selectIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedIndex: Math.max(0, Math.min(index, prev.results.length - 1)),
    }));
  }, []);

  /**
   * Execute the selected result's action
   */
  const executeSelected = useCallback(async () => {
    const { results, selectedIndex } = state;
    if (results.length === 0 || selectedIndex >= results.length) {
      return;
    }

    const selected = results[selectedIndex];
    try {
      await selected.action();

      // Track usage if it's an app
      if (selected.type === 'app') {
        await invoke('track_app_usage', { appId: selected.id });
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to execute action',
      }));
    }
  }, [state]);

  /**
   * Clear search state
   */
  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      results: [],
      query: '',
      selectedIndex: 0,
      isLoading: false,
      error: null,
      clipboardMode: false,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    search,
    selectNext,
    selectPrevious,
    selectIndex,
    executeSelected,
    clear,
  };
}
