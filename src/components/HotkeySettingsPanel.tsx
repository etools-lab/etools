/**
 * HotkeySettingsPanel - 热键管理面板
 * 允许用户查看和修改全局快捷键
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { HotkeyEditor } from './HotkeyEditor';
import { Kbd } from './ui/Kbd';
import { usePluginDispatch } from '../services/pluginStateStore';
import '../styles/components/HotkeySettingsPanel.css';

interface ShortcutPreset {
  id: string;
  name: string;
  description: string;
  defaultHotkey: string;
  configurable: boolean;
}

const SHORTCUT_PRESETS: ShortcutPreset[] = [
  {
    id: 'global-toggle',
    name: '打开/关闭搜索窗口',
    description: '全局快捷键，用于快速显示或隐藏主窗口',
    defaultHotkey: 'Cmd+Shift+K',
    configurable: true,
  },
  {
    id: 'clipboard-history',
    name: '剪贴板历史',
    description: '快速打开剪贴板历史记录',
    defaultHotkey: 'Cmd+Shift+V',
    configurable: true,
  },
];

export function HotkeySettingsPanel() {
  const dispatch = usePluginDispatch();
  const [currentHotkey, setCurrentHotkey] = useState<string>('Cmd+Shift+K');
  const [editingHotkey, setEditingHotkey] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsPath, setSettingsPath] = useState<string>('');

  // Load current hotkey and settings path on mount
  useEffect(() => {
    loadCurrentHotkey();
    loadSettingsPath();
  }, []);

  const loadCurrentHotkey = async () => {
    try {
      setLoading(true);
      const hotkey = await invoke<string>('get_hotkey');
      setCurrentHotkey(hotkey);
    } catch (error) {
      console.error('Failed to load hotkey:', error);
      // Use platform default
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      setCurrentHotkey(isMac ? 'Cmd+Shift+K' : 'Ctrl+Shift+K');
    } finally {
      setLoading(false);
    }
  };

  const loadSettingsPath = async () => {
    try {
      const path = await invoke<string>('get_settings_file_path');
      setSettingsPath(path);
    } catch (error) {
      console.error('Failed to get settings path:', error);
    }
  };

  const handleHotkeySave = async (newHotkey: string) => {
    try {

      // Check for conflicts
      const conflictList = await invoke<string[]>('check_hotkey_conflicts', { hotkey: newHotkey });

      if (conflictList.length > 0) {
        setConflicts(conflictList);
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: {
            type: 'warning',
            title: '快捷键冲突',
            message: `此快捷键可能与系统功能冲突：${conflictList.join(', ')}`,
            duration: 0,
          },
        });
      }

      // Reregister the hotkey dynamically (no restart needed)
      await invoke('reregister_hotkey', { hotkey: newHotkey });

      setCurrentHotkey(newHotkey);
      setEditingHotkey(false);
      setConflicts([]);

      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'success',
          title: '快捷键已更新',
          message: '立即生效',
        },
      });
    } catch (error) {
      console.error('Failed to save hotkey:', error);
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'error',
          title: '保存失败',
          message: error instanceof Error ? error.message : '未知错误',
          duration: 0,
        },
      });
    }
  };

  const handleResetHotkey = async () => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const defaultHotkey = isMac ? 'Cmd+Shift+K' : 'Ctrl+Shift+K';

    // Directly reset to default without confirmation
    await handleHotkeySave(defaultHotkey);
  };

  return (
    <div className="hotkey-settings-panel">
      {/* Header */}
      <div className="hotkey-settings-panel__header">
        <h2 className="hotkey-settings-panel__title">快捷键设置</h2>
        <p className="hotkey-settings-panel__subtitle">
          自定义全局快捷键，快速访问应用功能
        </p>
      </div>

      {/* Global Hotkey Section */}
      <section className="hotkey-settings-panel__section">
        <h3 className="hotkey-settings-panel__section-title">全局快捷键</h3>

        {loading ? (
          <div className="hotkey-settings-panel__loading">加载中...</div>
        ) : editingHotkey ? (
          <HotkeyEditor
            currentHotkey={currentHotkey}
            onSave={handleHotkeySave}
            onCancel={() => {
              setEditingHotkey(false);
              setConflicts([]);
            }}
          />
        ) : (
          <div className="hotkey-display">
            <div className="hotkey-display__current">
              <span className="hotkey-display__label">当前快捷键:</span>
              <Kbd className="kbd--large">{currentHotkey}</Kbd>
            </div>

            <div className="hotkey-display__actions">
              <button
                className="hotkey-display__button hotkey-display__button--primary"
                onClick={() => setEditingHotkey(true)}
              >
                修改快捷键
              </button>
              <button
                className="hotkey-display__button hotkey-display__button--secondary"
                onClick={handleResetHotkey}
              >
                重置为默认
              </button>
            </div>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="hotkey-settings-panel__warning">
            <span className="hotkey-settings-panel__warning-icon">⚠️</span>
            <div className="hotkey-settings-panel__warning-content">
              <strong>检测到冲突</strong>
              <p>此快捷键可能与以下系统功能冲突：</p>
              <ul>
                {conflicts.map((conflict, i) => (
                  <li key={i}>{conflict}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <p className="hotkey-settings-panel__hint">
          💡 提示：快捷键修改后立即生效，无需重启应用
        </p>
      </section>

      {/* Additional Shortcuts */}
      <section className="hotkey-settings-panel__section">
        <h3 className="hotkey-settings-panel__section-title">其他快捷键</h3>

        <div className="hotkey-list">
          {SHORTCUT_PRESETS.filter(p => p.id !== 'global-toggle').map(preset => (
            <div key={preset.id} className="hotkey-list__item">
              <div className="hotkey-list__item-info">
                <div className="hotkey-list__item-name">{preset.name}</div>
                <div className="hotkey-list__item-description">{preset.description}</div>
              </div>
              <div className="hotkey-list__item-hotkey">
                <Kbd>{preset.defaultHotkey}</Kbd>
              </div>
            </div>
          ))}
        </div>

        <p className="hotkey-settings-panel__hint">
          更多快捷键自定义功能即将推出
        </p>
      </section>

      {/* Keyboard Shortcuts Reference */}
      <section className="hotkey-settings-panel__section">
        <h3 className="hotkey-settings-panel__section-title">快捷键参考</h3>

        <div className="hotkey-reference">
          <div className="hotkey-reference__category">
            <h4 className="hotkey-reference__category-title">全局</h4>
            <div className="hotkey-reference__list">
              <div className="hotkey-reference__item">
                <Kbd>Esc</Kbd>
                <span>关闭窗口</span>
              </div>
            </div>
          </div>

          <div className="hotkey-reference__category">
            <h4 className="hotkey-reference__category-title">搜索</h4>
            <div className="hotkey-reference__list">
              <div className="hotkey-reference__item">
                <Kbd>↑</Kbd> <Kbd>↓</Kbd>
                <span>导航结果</span>
              </div>
              <div className="hotkey-reference__item">
                <Kbd>Enter</Kbd>
                <span>执行选中项</span>
              </div>
              <div className="hotkey-reference__item">
                <Kbd>Tab</Kbd>
                <span>切换搜索类型</span>
              </div>
            </div>
          </div>

          <div className="hotkey-reference__category">
            <h4 className="hotkey-reference__category-title">剪贴板</h4>
            <div className="hotkey-reference__list">
              <div className="hotkey-reference__item">
                <Kbd>Cmd</Kbd> + <Kbd>C</Kbd>
                <span>复制</span>
              </div>
              <div className="hotkey-reference__item">
                <Kbd>Cmd</Kbd> + <Kbd>V</Kbd>
                <span>粘贴</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Debug Information */}
      <section className="hotkey-settings-panel__section">
        <h3 className="hotkey-settings-panel__section-title">调试信息</h3>

        <div className="debug-info">
          <div className="debug-info__item">
            <span className="debug-info__label">配置文件路径:</span>
            <code className="debug-info__path">{settingsPath || '加载中...'}</code>
          </div>

          {settingsPath && (
            <button
              className="debug-info__copy-button"
              onClick={() => {
                navigator.clipboard.writeText(settingsPath);
                dispatch({
                  type: 'SHOW_NOTIFICATION',
                  payload: {
                    type: 'success',
                    title: '复制成功',
                    message: '路径已复制到剪贴板',
                    duration: 2000,
                  },
                });
              }}
            >
              复制路径
            </button>
          )}

          <p className="hotkey-settings-panel__hint">
            💡 提示：开发模式和发布模式的配置文件位于不同目录
          </p>
        </div>
      </section>
    </div>
  );
}
