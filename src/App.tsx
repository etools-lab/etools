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

import React, { useEffect } from "react";
import { PluginStoreProvider } from "@/services/pluginStateStore";
import { useTheme } from "@/hooks/useTheme";
import NotificationSystem from "@/components/PluginManager/NotificationSystem";
import { pluginLoader } from "@/services/pluginLoader";
import { initSandboxDevTools } from "@/services/sandboxDevTools";
import { ViewContainer } from "@/components/ViewContainer";
import "@/components/BackButton.css";
import "@/i18n"; // Initialize i18n
import "@/styles/design-tokens.css";
import "@/styles/global.css";
import "@/styles/theme-light.css";
import "@/styles/theme-dark.css";
// 组件样式
import "@/styles/components/ViewContainer.css";
import "@/styles/components/SearchView.css";
import "@/styles/components/SettingsView.css";
import "@/styles/components/ResultList.css";
import "@/styles/components/PluginManager/PluginManager.css";

function App() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const initializeApp = async () => {
      // ✅ 加载已安装的插件（从文件系统）
      try {
        await pluginLoader.loadInstalledPlugins();
        console.log('[App] Installed plugins loaded successfully');
      } catch (error) {
        console.error('[App] Failed to load installed plugins:', error);
      }

      // Initialize sandbox developer tools in development mode
      initSandboxDevTools();
    };

    initializeApp();
  }, []);

  // 单窗口架构：使用 ViewContainer 管理视图切换
  // 支持的视图：search（搜索）、settings（设置）、plugins（插件）
  return (
    <PluginStoreProvider>
      <NotificationSystem />
      <ViewContainer />
    </PluginStoreProvider>
  );
}

// Check if running in Tauri environment
const isTauri = () => typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;

// Type declaration for Tauri environment detection
declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}

export default App;
