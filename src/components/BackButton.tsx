import { useEffect } from 'react';
import { useViewManagerStore } from '@/stores/viewManagerStore';
import './BackButton.css';

/**
 * BackButton Component (T052-T054)
 *
 * Displays a back button when navigation history is available.
 * Automatically hides when there's no history to go back to.
 * Also handles Escape key (T055-T057) for going back.
 */
export function BackButton() {
  const { canGoBack, goBack, currentView } = useViewManagerStore();

  const handleClick = () => {
    goBack();
  };

  // Escape key listener (T055-T057)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger Escape if not in search view (FR-022)
      if (event.key === 'Escape' && currentView !== 'search') {
        if (canGoBack()) {
          event.preventDefault();
          goBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentView, canGoBack, goBack]);

  // Don't render if no history (FR-022: Hide when in root view)
  if (!canGoBack()) {
    return null;
  }

  return (
    <button
      className="back-button"
      onClick={handleClick}
      aria-label="返回"
      title="返回 (Escape)"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span>返回</span>
    </button>
  );
}
