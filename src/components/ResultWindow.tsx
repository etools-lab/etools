/**
 * ResultWindow - Dedicated window for displaying search results
 * This component runs in the separate "results" window
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { ResultList } from './ResultList';
import type { SearchResult } from '@/types/search';
import "@/styles/components/ResultWindow.css";
import { logger, initLogger } from '@/lib/logger';
import { showNotification } from '@/lib/notification';

// ============================================================================
// Constants
// ============================================================================

/** Window resize constraints */
const WINDOW_SIZE = {
  minHeight: 200,
  maxHeight: 600,
  minDelta: 3,
} as const;

/** Timing constants (milliseconds) */
const TIMING = {
  domUpdateDelay: 20,
  resizeDebounce: 50,
  initialResizeDelay: 150,
  hideDelay: 500,
} as const;

/** Element IDs */
const ELEMENT_IDS = {
  container: '.result-window-container',
  results: 'search-results',
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Event payload for showing search results
 */
export interface ShowResultsEvent {
  results: SearchResult[];
  query: string;
}

/**
 * Event payload for updating selection
 */
export interface UpdateSelectionEvent {
  selectedIndex: number;
}

/**
 * Tauri global window interface
 */
declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate constrained window height
 */
function calculateWindowHeight(contentHeight: number): number {
  return Math.max(
    WINDOW_SIZE.minHeight,
    Math.min(WINDOW_SIZE.maxHeight, Math.ceil(contentHeight))
  );
}

/**
 * Hide all windows after result execution
 */
async function hideAllWindows(): Promise<void> {
  await Promise.allSettled([
    emit('hide-main-window'),
    invoke('hide_results_window'),
    emit('result-selected', { clearQuery: true }),
  ]);
  logger.log('ResultWindow', 'Windows hidden');
}

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Custom hook for Tauri logger initialization
 */
function useLoggerInit(): void {
  useEffect(() => {
    initLogger();
    logger.info('ResultWindow', 'Component mounted');
  }, []);
}

/**
 * Custom hook for window size management
 * Handles dynamic window resizing based on content
 */
function useWindowSize(results: SearchResult[]): void {
  const lastHeightRef = useRef(0);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const container = document.querySelector(ELEMENT_IDS.container);
    if (!container) return;

    const updateWindowSize = async () => {
      const contentHeight = container.getBoundingClientRect().height;

      // Skip if height hasn't changed significantly
      if (Math.abs(contentHeight - lastHeightRef.current) < WINDOW_SIZE.minDelta) {
        return;
      }
      lastHeightRef.current = contentHeight;

      // Calculate and apply new height
      const newHeight = calculateWindowHeight(contentHeight);
      try {
        await invoke('update_results_window_size', { height: newHeight });
      } catch (error) {
        logger.error('ResultWindow', 'Failed to update window size', error);
      }
    };

    const debouncedUpdate = () => {
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(updateWindowSize, TIMING.resizeDebounce);
    };

    const resizeObserver = new ResizeObserver(debouncedUpdate);
    resizeObserver.observe(container);

    // Initial update after DOM is ready
    const initTimer = setTimeout(updateWindowSize, TIMING.initialResizeDelay);

    return () => {
      clearTimeout(resizeTimerRef.current);
      clearTimeout(initTimer);
      resizeObserver.disconnect();
    };
  }, [results]);
}

/**
 * Custom hook for listening to show-results events
 */
function useShowResultsListener(
  onResults: (results: SearchResult[], query: string) => void
): void {
  useEffect(() => {
    logger.info('ResultWindow', 'Setting up show-results listener');

    const unlistenPromise = listen<ShowResultsEvent>('show-results', (event) => {
      logger.log('ResultWindow', `Received ${event.payload.results.length} results`);
      logger.log('ResultWindow', `Query: "${event.payload.query}"`);
      onResults(event.payload.results, event.payload.query);
    });

    let unlistenFn: (() => void) | null = null;

    unlistenPromise
      .then((fn) => {
        unlistenFn = fn;
        logger.info('ResultWindow', 'show-results listener ready');
      })
      .catch((error) => {
        logger.error('ResultWindow', 'Failed to set up show-results listener', error);
      });

    return () => {
      if (unlistenFn) {
        logger.info('ResultWindow', 'Cleaning up show-results listener');
        unlistenFn();
      } else {
        logger.warn('ResultWindow', 'Cleanup called but unlistenFn is null');
      }
    };
  }, [onResults]);
}

/**
 * Custom hook for listening to update-selection events
 */
function useSelectionUpdateListener(
  onSelectionUpdate: (index: number) => void
): void {
  useEffect(() => {
    const unlistenPromise = listen<UpdateSelectionEvent>('update-selection', (event) => {
      onSelectionUpdate(event.payload.selectedIndex);
    });

    return () => {
      unlistenPromise.then(fn => fn());
    };
  }, [onSelectionUpdate]);
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ResultWindow component
 * Displays search results in a dedicated window
 */
export function ResultWindow() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState('');

  // Initialize logger on mount
  useLoggerInit();

  // Handle window resizing based on content
  useWindowSize(results);

  // Handle show-results events
  useShowResultsListener((newResults, newQuery) => {
    setResults(newResults);
    setQuery(newQuery);
    setSelectedIndex(0);
  });

  // Handle selection update events
  useSelectionUpdateListener(setSelectedIndex);

  /**
   * Handle result execution
   */
  const handleExecute = useCallback(async (index: number) => {
    const result = results[index];
    if (!result) return;

    logger.log('ResultWindow', `Executing action for: ${result.title}`);

    try {
      await result.action();
      logger.log('ResultWindow', 'Action executed successfully');
      showNotification(`已执行: ${result.title}`, 'success');
    } catch (error) {
      logger.error('ResultWindow', 'Failed to execute action', error);
      showNotification(`执行失败: ${result.title}`, 'error');
    }

    // Delay window hiding to let user see notification
    setTimeout(async () => {
      await hideAllWindows();
    }, TIMING.hideDelay);
  }, [results]);

  /**
   * Handle selection change
   */
  const handleSelectionChange = useCallback((index: number) => {
    setSelectedIndex(index);
    // Notify main window of selection change
    invoke('emit', {
      event: 'selection-changed',
      payload: { selectedIndex: index }
    }).catch(console.error);
  }, []);

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <div className="results-empty-state" role="status" aria-live="polite">
      <div className="empty-state-content">
        <div className="empty-state-icon">🔍</div>
        <p className="empty-state-text">正在搜索...</p>
      </div>
    </div>
  );

  /**
   * Render result list
   */
  const renderResultList = () => (
    <ResultList
      results={results}
      selectedIndex={selectedIndex}
      onSelectIndex={handleSelectionChange}
      onExecute={handleExecute}
      query={query}
      id={ELEMENT_IDS.results}
    />
  );

  return (
    <div
      className="result-window-container"
      role="region"
      aria-label="搜索结果"
    >
      {results.length === 0 ? renderEmptyState() : renderResultList()}
    </div>
  );
}

export default ResultWindow;
