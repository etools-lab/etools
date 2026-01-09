/**
 * HelloWindow - Hello World 插件弹窗
 * 显示来自 hello-world 插件的问候消息
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function HelloWindow() {
  const [message, setMessage] = useState<string>('Hello, World! 👋');

  // Log when component mounts
  console.log('[HelloWindow] Component mounted!');

  // Define handleClose before useEffect to satisfy React Hooks rules
  const handleClose = async () => {
    console.log('[HelloWindow] Closing window');
    try {
      await invoke('hide_hello_window');
    } catch (error) {
      console.error('[HelloWindow] Failed to close:', error);
    }
  };

  // Listen for hello-message event
  useEffect(() => {
    console.log('[HelloWindow] Setting up event listener for hello-message');

    const unlistenPromise = listen<string>('hello-message', (event) => {
      console.log('[HelloWindow] Received message:', event.payload);
      setMessage(event.payload);
    });

    // Also listen for Escape key to close
    const handleEscape = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        await handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      console.log('[HelloWindow] Cleaning up event listener');
      unlistenPromise.then(fn => fn());
      window.removeEventListener('keydown', handleEscape);
    };
  }, [handleClose]);

  console.log('[HelloWindow] Rendering with message:', message);

  return (
    <div className="hello-window">
      <div className="hello-container">
        {/* Close button */}
        <button
          className="hello-close"
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

        {/* Icon */}
        <div className="hello-icon">👋</div>

        {/* Message */}
        <h1 className="hello-message">{message}</h1>

        {/* Footer hint */}
        <p className="hello-hint">
          按 <kbd>Esc</kbd> 或点击关闭按钮退出
        </p>
      </div>
    </div>
  );
}
