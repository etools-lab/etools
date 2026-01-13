/**
 * SearchWindow - Unified single window for search input and results
 * Displays both the search input and results in the same window
 * Window height dynamically adjusts based on results
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSearch } from '@/hooks/useSearch';
import { ResultList } from './ResultList';
import type { SearchResult } from '@/types/search';
import { Kbd } from './ui/Kbd';
import { logger, initLogger } from '@/lib/logger';
import { SettingsButton } from './SearchWindow/SettingsButton';

// Recent App Item Component
interface RecentAppItemProps {
  app: {
    id: string;
    name: string;
    executable_path: string;
    icon?: string;
  };
  onClick: () => void;
}

function RecentAppItem({ app, onClick }: RecentAppItemProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(app.icon || null);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    // Load icon if not available
    if (!iconUrl && !loadingRef.current) {
      loadingRef.current = true;

      const loadIcon = async () => {
        try {
          const response = await invoke<{
            icon: string | null;
            icon_data_url: string | null;
          }>('get_app_icon_nsworkspace', {
            appPath: app.executable_path,
          });

          if (mountedRef.current) {
            const icon = response.icon_data_url || response.icon;
            if (icon) {
              setIconUrl(icon);
            }
          }
        } catch (error) {
          // Silently fail
        } finally {
          loadingRef.current = false;
        }
      };

      loadIcon();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [app.executable_path, iconUrl]);

  const isEmojiIcon = iconUrl && /^[\p{Emoji}\p{Symbol}\p{Other_Symbol}]/u.test(iconUrl);

  return (
    <div className="default-item" onClick={onClick}>
      {iconUrl ? (
        isEmojiIcon ? (
          <span className="default-item__icon">{iconUrl}</span>
        ) : (
          <img
            src={iconUrl}
            alt=""
            className="default-item__icon-img"
            loading="lazy"
          />
        )
      ) : (
        <span className="default-item__icon">📱</span>
      )}
      <span className="default-item__text">{app.name}</span>
    </div>
  );
}

export function SearchWindow() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, search, isLoading } = useSearch();
  const isUserTypingRef = useRef(false);
  const isHidingRef = useRef(false);

  // Limit results to max 10 items for fixed layout
  const limitedResults = results.slice(0, 10);

  // State for recently used apps
  const [recentApps, setRecentApps] = useState<Array<{
    id: string;
    name: string;
    executable_path: string;
    icon?: string;
  }>>([]);

  // Initialize logger on mount
  useEffect(() => {
    initLogger();
    logger.info('SearchWindow', 'Component mounted');

    // Load recently used apps
    invoke('get_recently_used', { limit: 10 })
      .then((response: { apps: Array<{ id: string; name: string; executable_path: string; icon?: string }> }) => {
        setRecentApps(response.apps);
      })
      .catch((error) => {
        console.error('Failed to load recently used apps:', error);
      });
  }, []);

  // Auto-focus input on mount and window show
  useEffect(() => {
    const focusInput = () => {
      if (document.activeElement !== inputRef.current && !isUserTypingRef.current) {
        inputRef.current?.focus();
      }
    };

    focusInput();

    const unlistenPromise = listen('window-shown', () => {
      if (!isUserTypingRef.current) {
        focusInput();
      }
    });
    return () => {
      unlistenPromise.then(fn => fn());
    };
  }, []);

  // Reset typing flag after user stops typing
  useEffect(() => {
    if (!isUserTypingRef.current) return;

    const timer = setTimeout(() => {
      isUserTypingRef.current = false;
    }, 1000);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle search with debounce (increased for smoother typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 200); // Increased from 150ms to 200ms for better typing experience

    return () => clearTimeout(timer);
  }, [query, search]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = selectedIndex < limitedResults.length - 1 ? selectedIndex + 1 : selectedIndex;
        setSelectedIndex(nextIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : 0;
        setSelectedIndex(prevIndex);
        break;
      case 'Enter':
        e.preventDefault();
        if (limitedResults[selectedIndex]) {
          await handleSelect(limitedResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        isHidingRef.current = true;
        await hideWindow();
        setTimeout(() => {
          isHidingRef.current = false;
        }, 100);
        break;
    }
  };

  // Handle result selection
  const handleSelect = async (result: SearchResult) => {
    if (!result.action) {
      logger.error('SearchWindow', 'No action defined for result:', result);
      return;
    }

    try {
      await result.action();

      // Track usage if it's an app
      if (result.type === 'app') {
        try {
          await invoke('track_app_usage', { appId: result.id });
        } catch (error) {
          console.warn('Failed to track app usage:', error);
        }
      }

      isHidingRef.current = true;

      // Hide window and clear state
      await hideWindow();
      setQuery('');

      setTimeout(() => {
        isHidingRef.current = false;
      }, 100);
    } catch (error) {
      console.error('Failed to execute action:', error);
      isHidingRef.current = true;
      await hideWindow().catch(() => {});
      setQuery('');
      setTimeout(() => {
        isHidingRef.current = false;
      }, 100);
    }
  };

  // Hide window
  const hideWindow = async () => {
    try {
      await invoke('hide_window');
    } catch (error) {
      console.error('Failed to hide window:', error);
    }
  };

  // Handle result item click
  const handleResultClick = useCallback(async (index: number) => {
    if (limitedResults[index]) {
      await handleSelect(limitedResults[index]);
    }
  }, [limitedResults]);

  return (
    <div
      className="search-window"
      onClick={() => inputRef.current?.focus()}
      role="search"
      aria-label="应用程序启动器搜索窗口"
    >
      <div className="search-container">
        {/* Search Input */}
        <div className="search-input-section">
          <svg
            className="search-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            ref={inputRef}
            type="search"
            className="search-input"
            placeholder="Search apps..."
            value={query}
            onChange={e => {
              isUserTypingRef.current = true;
              setQuery(e.target.value);
            }}
            onFocus={() => {
              isUserTypingRef.current = false;
            }}
            onKeyDown={handleKeyDown}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="搜索应用程序"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : undefined}
          />
          {isLoading && (
            <div
              className="search-spinner"
              role="status"
              aria-live="polite"
              aria-label="正在搜索"
            >
              <svg
                className="spinner"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  opacity="0.25"
                />
                <path
                  d="M12 2A10 10 0 0 1 22 12"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray="32"
                  strokeDashoffset="32"
                />
              </svg>
            </div>
          )}
          {query && (
            <button
              className={`clear-button ${query ? 'visible' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
              }}
              type="button"
              aria-label="清除搜索"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          <SettingsButton />
        </div>

        {/* Search Results */}
        {query && limitedResults.length > 0 && (
          <div className="search-results-section">
            <ResultList
              results={limitedResults}
              selectedIndex={selectedIndex}
              onSelectIndex={setSelectedIndex}
              onExecute={handleResultClick}
              query={query}
              id="search-results"
            />
            {results.length > 10 && (
              <div className="search-results-footer">
                显示前 10 个结果，共 {results.length} 个
              </div>
            )}
          </div>
        )}

        {/* Footer with keyboard shortcuts or default content */}
        {!query && (
          <div className="search-footer" role="note" aria-label="默认内容区域">
            <div className="default-content">
              <div className="default-section">
                <h3 className="default-section__title">最近使用</h3>
                <div className="default-section__items">
                  {recentApps.length > 0 ? (
                    recentApps.map((app) => (
                      <RecentAppItem
                        key={app.id}
                        app={app}
                        onClick={() => handleSelect({
                          id: app.id,
                          title: app.name,
                          type: 'app',
                          action: async () => {
                            await invoke('launch_app', { path: app.executable_path });
                            await invoke('track_app_usage', { appId: app.id });
                          },
                        } as any)}
                      />
                    ))
                  ) : (
                    <div className="default-item">
                      <span className="default-item__icon">💡</span>
                      <span className="default-item__text">暂无最近使用</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="default-section">
                <h3 className="default-section__title">已固定</h3>
                <div className="default-section__items">
                  <div className="default-item">
                    <span className="default-item__icon">💡</span>
                    <span className="default-item__text">暂无固定应用</span>
                  </div>
                </div>
              </div>
              <div className="default-section">
                <h3 className="default-section__title">推荐插件</h3>
                <div className="default-section__items">
                  <div className="default-item">
                    <span className="default-item__icon">🔢</span>
                    <span className="default-item__text">计算器 - 输入数学表达式</span>
                  </div>
                  <div className="default-item">
                    <span className="default-item__icon">🎨</span>
                    <span className="default-item__text">颜色转换 - HEX/RGB/HSL</span>
                  </div>
                  <div className="default-item">
                    <span className="default-item__icon">🔍</span>
                    <span className="default-item__text">网页搜索 - 快速搜索</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
