/**
 * Browser Result Item Component (T152, T154)
 * Displays browser bookmark and history results with favicon
 */

import { useState } from 'react';
import { Kbd } from './ui/Kbd';
import { formatRelativeTime } from '@/utils/formatters';
import { getBrowserIcon } from '@/utils/iconMaps';
import './BrowserResultItem.css';

export interface BrowserResultItemData {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  browser: string;
  entry_type: 'bookmark' | 'history';
  visit_count?: number;
  last_visited?: number;
}

interface BrowserResultItemProps {
  item: BrowserResultItemData;
  isActive?: boolean;
  onClick?: () => void;
}

export function BrowserResultItem({ item, isActive = false, onClick }: BrowserResultItemProps) {
  const [faviconError, setFaviconError] = useState(false);

  const getFaviconUrl = (): string => {
    if (item.favicon) return item.favicon;

    // Use Google's favicon service as fallback
    try {
      const url = new URL(item.url);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
    } catch {
      return '';
    }
  };

  const getTypeBadge = (): string => {
    return item.entry_type === 'bookmark' ? '书签' : '历史';
  };

  return (
    <div
      className={`browser-result ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="browser-result__icon">
        {!faviconError && getFaviconUrl() ? (
          <img
            src={getFaviconUrl()}
            alt=""
            className="browser-result__favicon"
            onError={() => setFaviconError(true)}
            loading="lazy"
          />
        ) : (
          <span className="browser-result__fallback-icon">{getBrowserIcon(item.browser)}</span>
        )}
      </div>

      <div className="browser-result__content">
        <div className="browser-result__title">{item.title}</div>
        <div className="browser-result__url">{getDomain()}</div>
      </div>

      <div className="browser-result__meta">
        <span className={`browser-result__type browser-result__type--${item.entry_type}`}>
          {getTypeBadge()}
        </span>
        {item.visit_count !== undefined && item.visit_count > 0 && (
          <Kbd>{item.visit_count}次</Kbd>
        )}
      </div>
    </div>
  );
}
