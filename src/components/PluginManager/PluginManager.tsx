/**
 * PluginManager Component
 * Main container for plugin management with tabbed interface
 */

import React, { useState } from 'react';
import { usePluginState, usePluginDispatch } from '../../services/pluginStateStore';
import InstalledPluginsView from './InstalledPluginsView';
import MarketplaceView from './MarketplaceView';
import PluginDetailPanel from './PluginDetailPanel';
import { SkipLinks } from '../../lib/accessibility';
import { useI18n } from '../../hooks/useI18n';
import { LanguageSelector } from '../ui/LanguageSelector';
import './PluginManager.css';

export type PluginManagerView = 'installed' | 'marketplace';

interface PluginManagerProps {
  /**
   * Initial view to display
   * @default 'installed'
   */
  initialView?: PluginManagerView;

  /**
   * Whether to show the marketplace tab
   * @default true
   */
  showMarketplace?: boolean;
}

/**
 * PluginManager - Unified plugin management interface
 *
 * Provides a tabbed interface for:
 * - Viewing and managing installed plugins
 * - Browsing and installing plugins from npm marketplace
 */
const PluginManager: React.FC<PluginManagerProps> = ({
  initialView = 'installed',
  showMarketplace = true,
}) => {
  const { t } = useI18n();
  const dispatch = usePluginDispatch();
  const state = usePluginState();

  // Sync local state with global state
  const [currentView, setCurrentView] = useState<PluginManagerView>(() => {
    // Initialize from global state or prop
    return state.currentView || initialView;
  });

  /**
   * Handle tab switch
   */
  const handleTabChange = (view: PluginManagerView) => {
    setCurrentView(view);
    dispatch({ type: 'SET_VIEW', payload: view });
  };

  /**
   * Render tab navigation
   */
  const renderTabNavigation = () => {
    return (
      <div className="plugin-manager-tabs" role="tablist" aria-label={t('pluginManager.title')} data-testid="tab-navigation">
        <button
          className={`tab-button ${currentView === 'installed' ? 'active' : ''}`}
          role="tab"
          id="tab-installed"
          aria-selected={currentView === 'installed'}
          aria-controls="panel-installed"
          tabIndex={currentView === 'installed' ? 0 : -1}
          onClick={() => handleTabChange('installed')}
        >
          {t('pluginManager.tabs.installed')}
        </button>
        {showMarketplace && (
          <button
            className={`tab-button ${currentView === 'marketplace' ? 'active' : ''}`}
            role="tab"
            id="tab-marketplace"
            aria-selected={currentView === 'marketplace'}
            aria-controls="panel-marketplace"
            tabIndex={currentView === 'marketplace' ? 0 : -1}
            onClick={() => handleTabChange('marketplace')}
          >
            {t('pluginManager.tabs.marketplace')}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="plugin-manager" role="main" aria-label={t('pluginManager.title')} data-testid="plugin-manager">
      {/* Skip Links for accessibility */}
      <SkipLinks />

      {/* Header */}
      <div className="plugin-manager-header">
        <h2 className="plugin-manager-title" id="plugin-manager-heading">
          {t('pluginManager.title')}
        </h2>
        <LanguageSelector />
        {renderTabNavigation()}
      </div>

      {/* Content */}
      <div className="plugin-manager-content" role="presentation">
        <div
          role="tabpanel"
          id="panel-installed"
          aria-labelledby="tab-installed"
          tabIndex={0}
          style={{ display: currentView === 'installed' ? 'block' : 'none' }}
        >
          <InstalledPluginsView />
        </div>
        {showMarketplace && (
          <div
            role="tabpanel"
            id="panel-marketplace"
            aria-labelledby="tab-marketplace"
            tabIndex={0}
            style={{ display: currentView === 'marketplace' ? 'block' : 'none' }}
          >
            <MarketplaceView isActive={currentView === 'marketplace'} />
          </div>
        )}
      </div>

      {/* Detail Panel - shown when a plugin is selected */}
      {state.detailPanelPluginId && (
        <div className="plugin-detail-panel-overlay">
          <PluginDetailPanel
            pluginId={state.detailPanelPluginId}
            onClose={() => dispatch({ type: 'HIDE_DETAILS' })}
          />
        </div>
      )}
    </div>
  );
};

export default PluginManager;
