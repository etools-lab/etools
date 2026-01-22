/**
 * Productivity Launcher Main App
 * Quick app/file/web search with plugin support
 *
 * Optimized with:
 * - Modern design system
 * - Performance optimizations (memo, useMemo, useCallback)
 * - Enhanced accessibility
 * - Smooth animations and transitions
 */

import { useEffect } from 'react';
import { PluginStoreProvider } from '@/services/pluginStateStore';
import NotificationSystem from '@/components/PluginManager/NotificationSystem';
import { pluginLoader } from '@/services/pluginLoader';
import { initSandboxDevTools } from '@/services/sandboxDevTools';
import { ViewContainer } from '@/components/ViewContainer';
import { initLogger, logger } from '@/lib/logger';
import { flushLog } from '@/lib/logger';

// Styles
import '@/components/BackButton.css';
import '@/i18n';
import '@/styles/design-tokens.css';
import '@/styles/global.css';
import '@/styles/theme-light.css';
import '@/styles/theme-dark.css';
import '@/styles/components/ViewContainer.css';
import '@/styles/components/SearchView.css';
import '@/styles/components/SettingsView.css';
import '@/styles/components/ResultList.css';
import '@/styles/components/PluginManager/PluginManager.css';
import '@/styles/components/PluginUIView.css';

function App() {
  useEffect(() => {
    // 初始化日志系统
    initLogger();

    const initializeApp = async () => {
      try {
        logger.info('App', 'Initializing application');
        await pluginLoader.loadInstalledPlugins();
        logger.info('App', 'Plugins loaded successfully');
      } catch (error) {
        logger.error('App', 'Failed to load installed plugins', error);
        console.error('[App] Failed to load installed plugins:', error);
      }

      initSandboxDevTools();
      logger.info('App', 'Sandbox devtools initialized');
    };

    initializeApp();

    // 全局错误处理
    const handleError = (event: ErrorEvent) => {
      logger.error('GlobalError', `Unhandled error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('GlobalError', 'Unhandled promise rejection', {
        reason: event.reason,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // 清理函数
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      flushLog(); // 刷新日志
    };
  }, []);

  return (
    <PluginStoreProvider>
      <NotificationSystem />
      <ViewContainer />
    </PluginStoreProvider>
  );
}

export default App;
