/**
 * PluginPopupWindow - 通用插件弹窗
 * 所有插件都可以使用这个通用弹窗来显示内容
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface PluginPopupData {
  pluginId: string;
  title: string;
  message: string;
  icon?: string;
  buttons?: Array<{ label: string; value: string; isPrimary?: boolean }>;
  style?: 'info' | 'success' | 'warning' | 'error';
}

export function PluginPopupWindow() {
  const [popupData, setPopupData] = useState<PluginPopupData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  console.log('[PluginPopupWindow] Component mounted');

  // Define handleClose before useEffect to satisfy React Hooks rules
  const handleClose = async () => {
    console.log('[PluginPopupWindow] Closing popup');
    setIsVisible(false);
    setPopupData(null);

    try {
      await invoke('hide_plugin_popup');
    } catch (error) {
      console.error('[PluginPopupWindow] Failed to close:', error);
    }
  };

  const handleButtonClick = async (buttonValue: string) => {
    console.log('[PluginPopupWindow] Button clicked:', buttonValue);

    // Emit button click event back to plugin
    if (popupData) {
      const event = new CustomEvent('plugin-popup-button-click', {
        detail: { pluginId: popupData.pluginId, buttonValue }
      });
      window.dispatchEvent(event);
    }

    await handleClose();
  };

  useEffect(() => {
    console.log('[PluginPopupWindow] Setting up event listeners');

    // Listen for popup events
    const unlistenPromise = listen<PluginPopupData>('plugin-popup', (event) => {
      console.log('[PluginPopupWindow] Received popup data:', event.payload);
      setPopupData(event.payload);
      setIsVisible(true);
    });

    // Listen for close events
    const unlistenClosePromise = listen('plugin-popup-close', () => {
      console.log('[PluginPopupWindow] Received close event');
      handleClose();
    });

    // Listen for Escape key
    const handleEscape = async (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        await handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      console.log('[PluginPopupWindow] Cleaning up');
      unlistenPromise.then(fn => fn());
      unlistenClosePromise.then(fn => fn());
      window.removeEventListener('keydown', handleEscape);
    };
  }, [handleClose, isVisible]);

  if (!isVisible || !popupData) {
    return (
      <div className="plugin-popup-window plugin-popup-window--hidden">
        <div className="plugin-popup-container">
          <p>等待插件调用...</p>
        </div>
      </div>
    );
  }

  const style = popupData.style || 'info';

  return (
    <div className={`plugin-popup-window plugin-popup-window--visible plugin-popup-window--${style}`}>
      <div className="plugin-popup-container">
        {/* Header */}
        <div className="plugin-popup-header">
          <div className="plugin-popup-title-row">
            {popupData.icon && (
              <span className="plugin-popup-icon">{popupData.icon}</span>
            )}
            <h2 className="plugin-popup-title">{popupData.title}</h2>
          </div>
          <button
            className="plugin-popup-close"
            onClick={handleClose}
            aria-label="关闭"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="plugin-popup-content">
          <p className="plugin-popup-message">{popupData.message}</p>
        </div>

        {/* Footer */}
        {popupData.buttons && popupData.buttons.length > 0 && (
          <div className="plugin-popup-footer">
            {popupData.buttons.map((button, index) => (
              <button
                key={index}
                className={`plugin-popup-button ${
                  button.isPrimary ? 'plugin-popup-button--primary' : ''
                }`}
                onClick={() => handleButtonClick(button.value)}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}

        {/* Hint if no buttons */}
        {!popupData.buttons || popupData.buttons.length === 0 ? (
          <p className="plugin-popup-hint">
            按 <kbd>Esc</kbd> 或点击关闭按钮退出
          </p>
        ) : null}
      </div>
    </div>
  );
}
