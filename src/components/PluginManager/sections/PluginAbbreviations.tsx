/**
 * Plugin Abbreviations Component
 */

import React from 'react';
import { PluginAbbreviationService } from '../../../services/pluginAbbreviationService';
import type { PluginAbbreviation } from '../../../types/plugin';

interface PluginAbbreviationsProps {
  pluginName: string;
  abbreviations: PluginAbbreviation[];
  newKeyword: string;
  error: string | null;
  onKeywordChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (keyword: string) => void;
  onToggle: (keyword: string) => void;
}

export const PluginAbbreviations: React.FC<PluginAbbreviationsProps> = ({
  pluginName,
  abbreviations,
  newKeyword,
  error,
  onKeywordChange,
  onAdd,
  onRemove,
  onToggle,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onAdd();
    }
  };

  return (
    <div className="detail-section">
      <h3>自定义缩写</h3>
      <p className="section-description">
        为此插件设置自定义缩写，快速搜索和触发插件功能
      </p>

      {/* Add new abbreviation */}
      <div className="add-abbreviation-form">
        <input
          type="text"
          className="abbreviation-input"
          placeholder="输入缩写关键词（如：hw）"
          value={newKeyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button
          className="add-abbr-btn"
          onClick={onAdd}
          disabled={!newKeyword.trim()}
        >
          添加
        </button>
      </div>

      {error && <p className="abbr-error">{error}</p>}

      {/* Suggested abbreviations */}
      {pluginName && (
        <div className="suggestions">
          <span className="suggestions-label">建议：</span>
          {PluginAbbreviationService.generateSuggestions(pluginName).map((suggestion) => (
            <button
              key={suggestion}
              className="suggestion-chip"
              onClick={() => onKeywordChange(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Abbreviations list */}
      <div className="abbreviations-list">
        {abbreviations.length === 0 ? (
          <p className="empty-state">暂无自定义缩写</p>
        ) : (
          abbreviations.map((abbr) => (
            <div
              key={abbr.keyword}
              className={`abbr-item ${abbr.enabled ? '' : 'disabled'}`}
            >
              <div className="abbr-info">
                <code className="abbr-keyword">{abbr.keyword}</code>
                <span className="abbr-status">
                  {abbr.enabled ? '已启用' : '已禁用'}
                </span>
              </div>
              <div className="abbr-actions">
                <button
                  className="abbr-toggle-btn"
                  onClick={() => onToggle(abbr.keyword)}
                  title={abbr.enabled ? '禁用' : '启用'}
                >
                  {abbr.enabled ? '🔒' : '🔓'}
                </button>
                <button
                  className="abbr-remove-btn"
                  onClick={() => onRemove(abbr.keyword)}
                  title="删除"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
