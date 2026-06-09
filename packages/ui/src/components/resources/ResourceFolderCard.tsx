import { Folder } from 'lucide-react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';

export interface ResourceFolderCardProps {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  resourceCount?: number;
  createdBy?: string | null;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ResourceFolderCard({
  name,
  description,
  color,
  resourceCount = 0,
  onClick,
  onEdit,
  onDelete,
}: ResourceFolderCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border bg-card cursor-pointer',
        'hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700'
      )}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-md flex items-center justify-center shrink-0',
          color ? '' : 'bg-zinc-100 dark:bg-zinc-800/50'
        )}
        style={color ? { backgroundColor: color } : undefined}
      >
        <Folder className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{name}</h4>
          <Badge className="text-[11px] px-1.5 py-0">{resourceCount}</Badge>
        </div>
        {description && (
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400 line-clamp-2">{description}</p>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="flex flex-col items-end gap-1">
          {onEdit && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-xs text-zinc-500">Edit</button>
          )}
          {onDelete && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-xs text-rose-600">Delete</button>
          )}
        </div>
      )}
    </div>
  );
}
