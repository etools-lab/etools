/**
 * Plugin UI Container
 * Standard container component for plugin UI to ensure consistency
 *
 * Usage:
 * import { PluginUIContainer } from '@etools/plugin-sdk';
 *
 * <PluginUIContainer title="My Plugin">
 *   <YourPluginContent />
 * </PluginUIContainer>
 */

import { memo, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import './PluginUIContainer.css';

export interface PluginUIContainerProps {
  /** Plugin title displayed in header */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Optional icon emoji or component */
  icon?: string | ReactNode;
  /** Plugin content */
  children: ReactNode;
  /** Optional footer actions */
  actions?: ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string;
  /** Additional CSS class */
  className?: string;
}

export const PluginUIContainer = memo(({
  title,
  subtitle,
  icon,
  children,
  actions,
  isLoading = false,
  error,
  className = '',
}: PluginUIContainerProps) => {
  return (
    <div className={`plugin-ui-container ${className}`}>
      <Card variant="elevated" padding="lg" className="plugin-ui-card">
        {/* Header */}
        <div className="plugin-ui-header">
          {icon && (
            <div className="plugin-ui-icon">
              {typeof icon === 'string' ? icon : icon}
            </div>
          )}
          <div className="plugin-ui-header-content">
            <h2 className="plugin-ui-title">{title}</h2>
            {subtitle && (
              <p className="plugin-ui-subtitle">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="plugin-ui-error">
            <span className="plugin-ui-error-icon">⚠️</span>
            <span className="plugin-ui-error-message">{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="plugin-ui-loading">
            <div className="plugin-ui-spinner" />
            <p>加载中...</p>
          </div>
        ) : (
          /* Content */
          <div className="plugin-ui-content">
            {children}
          </div>
        )}

        {/* Actions Footer */}
        {actions && !isLoading && (
          <div className="plugin-ui-actions">
            {actions}
          </div>
        )}
      </Card>
    </div>
  );
});

PluginUIContainer.displayName = 'PluginUIContainer';
