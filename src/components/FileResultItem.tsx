/**
 * File Result Item Component (T151, T153)
 * Displays file search results with path and metadata
 */

import { Kbd } from './ui/Kbd';
import { getFileIcon } from '@/utils/iconMaps';
import { formatFileSize } from '@/utils/formatters';
import './FileResultItem.css';

export interface FileResultItemData {
  id: string;
  path: string;
  filename: string;
  extension?: string;
  size: number;
  modified: number;
  hidden: boolean;
}

interface FileResultItemProps {
  item: FileResultItemData;
  isActive?: boolean;
  onClick?: () => void;
}

export function FileResultItem({ item, isActive = false, onClick }: FileResultItemProps) {
  const getPathParts = () => {
    const parts = item.path.split('/');
    return parts.slice(0, -1); // Remove filename
  };

  return (
    <div
      className={`file-result ${isActive ? 'active' : ''} ${item.hidden ? 'hidden' : ''}`}
      onClick={onClick}
    >
      <div className="file-result__icon">{getFileIcon(item.extension)}</div>

      <div className="file-result__content">
        <div className="file-result__name">{item.filename}</div>
        <div className="file-result__path">
          {getPathParts().join(' / ')}
        </div>
      </div>

      <div className="file-result__meta">
        <Kbd>{formatFileSize(item.size)}</Kbd>
      </div>
    </div>
  );
}
