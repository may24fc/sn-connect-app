import { Folder, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Badge } from '../../primitives/badge';

export interface ResourceFolderCardProps {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  resourceCount?: number;
  createdBy?: string | null;
  approvalStatus?: 'approved' | 'pending_deletion';
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ResourceFolderCard({
  name,
  description,
  color,
  approvalStatus,
  onClick,
  onEdit,
  onDelete,
}: ResourceFolderCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative group flex items-start gap-3 p-3 rounded-lg border bg-card cursor-pointer',
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
          {approvalStatus === 'pending_deletion' ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-700 border-amber-300">
              Pending Deletion
            </Badge>
          ) : null}
        </div>
        {description && (
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400 line-clamp-2">{description}</p>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label="Edit folder"
              className="p-1.5 rounded-md transition-all duration-150 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm"
            >
              <Pencil className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete folder"
              className="p-1.5 rounded-md transition-all duration-150 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
