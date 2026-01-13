/**
 * Clipboard Result Item Component (T086-T090)
 * Displays clipboard history items with image preview and paste functionality
 */

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Kbd } from './ui/Kbd';
import { formatRelativeTime } from '@/utils/formatters';
import './ClipboardResultItem.css';

export interface ClipboardItem {
  id: string;
  content_type: 'text' | 'image' | 'file';
  content: string;
  timestamp: number;
  is_sensitive?: boolean;
}

interface ClipboardResultItemProps {
  item: ClipboardItem;
  isActive?: boolean;
  onClick?: () => void;
}

export function ClipboardResultItem({ item, isActive = false, onClick }: ClipboardResultItemProps) {
  const [imageError, setImageError] = useState(false);

  const handlePaste = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('paste_clipboard_item', { itemId: item.id });
      console.log('Pasted clipboard item:', item.id);
    } catch (err) {
      console.error('Failed to paste clipboard item:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('delete_clipboard_item', { itemId: item.id });
      console.log('Deleted clipboard item:', item.id);
    } catch (err) {
      console.error('Failed to delete clipboard item:', err);
    }
  };

  const renderContent = () => {
    switch (item.content_type) {
      case 'text':
        return (
          <div className="clipboard-result__text">
            {item.content.length > 100
              ? item.content.slice(0, 100) + '...'
              : item.content}
          </div>
        );

      case 'image':
        if (imageError) {
          return (
            <div className="clipboard-result__placeholder">
              <span>📷 图片预览不可用</span>
            </div>
          );
        }
        return (
          <div className="clipboard-result__image-wrapper">
            <img
              src={item.content}
              alt="剪贴板图片"
              className="clipboard-result__image"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </div>
        );

      case 'file':
        return (
          <div className="clipboard-result__file">
            <span className="clipboard-result__file-icon">📄</span>
            <span className="clipboard-result__file-name">
              {item.content.split('/').pop() || item.content}
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`clipboard-result ${isActive ? 'active' : ''} ${item.is_sensitive ? 'sensitive' : ''}`}
      onClick={onClick}
    >
      <div className="clipboard-result__content">
        {renderContent()}

        <div className="clipboard-result__meta">
          <span className="clipboard-result__time">
            {formatRelativeTime(item.timestamp)}
          </span>
          {item.is_sensitive && (
            <span className="clipboard-result__sensitive-badge">敏感</span>
          )}
        </div>
      </div>

      <div className="clipboard-result__actions">
        <button
          className="clipboard-result__action"
          onClick={handlePaste}
          title="粘贴 (Enter)"
        >
          粘贴
        </button>
        <button
          className="clipboard-result__action clipboard-result__action--delete"
          onClick={handleDelete}
          title="删除"
        >
          删除
        </button>
      </div>
    </div>
  );
}

/**
 * Clipboard history list header
 */
export function ClipboardHistoryHeader({
  itemCount,
  onClear,
}: {
  itemCount: number;
  onClear: () => void;
}) {
  const handleClear = async () => {
    if (confirm('确定要清空剪贴板历史吗？')) {
      try {
        await invoke('clear_clipboard_history');
        onClear();
      } catch (err) {
        console.error('Failed to clear clipboard history:', err);
      }
    }
  };

  return (
    <div className="clipboard-history-header">
      <div className="clipboard-history-header__info">
        <h3>剪贴板历史</h3>
        <span className="clipboard-history-header__count">
          {itemCount} 项
        </span>
      </div>
      <button
        className="clipboard-history-header__clear"
        onClick={handleClear}
      >
        清空历史
      </button>
    </div>
  );
}
