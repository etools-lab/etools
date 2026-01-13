/**
 * ResultList Component
 * Displays search results with keyboard navigation support
 *
 * Optimized with:
 * - React.memo to prevent unnecessary re-renders
 * - Search highlighting
 * - Smooth animations
 * - Accessibility enhancements
 * - Fast icon loading using iconutil command
 */

import { memo, useMemo, useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SearchResult } from "@/types/search";
import "@/styles/components/ResultList.css";

interface ResultListProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onExecute: (index: number) => void;
  query?: string;
  id?: string;
}

// Memoized result item component for performance
const ResultItem = memo(({
  result,
  isSelected,
  onClick,
  onMouseEnter,
  query
}: {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  query?: string;
}) => {
  // Local icon state for lazy loading
  const [iconUrl, setIconUrl] = useState<string | null>(result.icon || null);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  // Load app icon on mount for app results without icons
  useEffect(() => {
    mountedRef.current = true;

    // Only load icon for app results without existing icon
    if (result.type === 'app' && !result.icon && result.path && !loadingRef.current) {
      loadingRef.current = true;

      const loadIcon = async () => {
        try {
          const response = await invoke<{
            icon: string | null;
            icon_data_url: string | null;
          }>('get_app_icon_nsworkspace', {
            appPath: result.path,
          });

          if (mountedRef.current) {
            const icon = response.icon_data_url || response.icon;
            if (icon) {
              setIconUrl(icon);
            }
          }
        } catch (error) {
          // Silently fail - icon loading is not critical
        } finally {
          loadingRef.current = false;
        }
      };

      // Small delay to avoid blocking
      const timer = setTimeout(loadIcon, 10);
      return () => clearTimeout(timer);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [result.type, result.icon, result.path]);

  const isEmojiIcon = iconUrl && /^[\p{Emoji}\p{Symbol}\p{Other_Symbol}]/u.test(iconUrl);

  // Memoize highlighted title to avoid recalculating on each render
  const highlightedTitle = useMemo(() => {
    if (!query || !result.title) return result.title;

    // Simple case-insensitive highlight
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = result.title.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return <mark key={index} className="highlight">{part}</mark>;
      }
      return part;
    });
  }, [query, result.title]);

  // Memoize highlighted subtitle
  const highlightedSubtitle = useMemo(() => {
    if (!query || !result.subtitle) return result.subtitle;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = result.subtitle.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return <mark key={index} className="highlight">{part}</mark>;
      }
      return part;
    });
  }, [query, result.subtitle]);

  return (
    <li
      className={`result-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      role="option"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
    >
      {/* Icon */}
      <div className="result-item__icon">
        {iconUrl ? (
          isEmojiIcon ? (
            <span className="result-item__icon-emoji" aria-hidden="true">
              {iconUrl}
            </span>
          ) : (
            <img
              src={iconUrl}
              alt=""
              className="result-item__icon-img"
              loading="lazy"
            />
          )
        ) : (
          <div className="result-item__icon-placeholder" aria-hidden="true">
            {getTypeIcon(result.type)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="result-item__content">
        <div className="result-item__title">{highlightedTitle}</div>
        {result.subtitle && (
          <div className="result-item__subtitle">
            {highlightedSubtitle}
          </div>
        )}
        {result.source && (
          <div className="result-item__source" aria-label={`Source: ${result.source}`}>
            {result.source}
          </div>
        )}
      </div>

      {/* Meta info */}
      {(result.score !== undefined || result.type) && (
        <div className="result-item__meta">
          {result.score !== undefined && result.score > 0.7 && (
            <div className="result-item__badge" aria-label="High match">
              Top Match
            </div>
          )}
        </div>
      )}
    </li>
  );
});

ResultItem.displayName = "ResultItem";

// Main ResultList component with memo
export const ResultList = memo(({
  results,
  selectedIndex,
  onSelectIndex,
  onExecute,
  query = "",
  id = "search-results"
}: ResultListProps) => {
  // Empty state - only show when there's a query but no results
  if (results.length === 0 && query) {
    return (
      <div
        className="result-list empty"
        role="listbox"
        aria-label="搜索结果"
        id={id}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">🔍</div>
          <p className="empty-state__text">
            {`没有找到 "${query}" 的结果`}
          </p>
          <p className="empty-state__suggestion">
            尝试不同的关键词或检查拼写
          </p>
        </div>
      </div>
    );
  }

  // No results and no query - don't render anything
  if (results.length === 0) {
    return null;
  }

  return (
    <div
      className="result-list"
      role="listbox"
      aria-label="搜索结果"
      id={id}
      aria-live="polite"
      aria-atomic="true"
    >
      <ul className="result-list__items" role="presentation">
        {results.map((result, index) => (
          <ResultItem
            key={`${result.type}-${result.id}`}
            result={result}
            isSelected={index === selectedIndex}
            onClick={() => onExecute(index)}
            onMouseEnter={() => onSelectIndex(index)}
            query={query}
          />
        ))}
      </ul>
    </div>
  );
});

ResultList.displayName = "ResultList";

/**
 * Get icon character for result type
 * Memoized to avoid recreating on each call
 */
const getTypeIcon = (type: SearchResult['type']): string => {
  const icons: Record<SearchResult['type'], string> = {
    app: '📱',
    file: '📄',
    clipboard: '📋',
    bookmark: '⭐',
    history: '🕐',
    plugin: '🔌',
    action: '⚡',
    url: '🔗',
    color: '🎨',
  };
  return icons[type] || '•';
};
