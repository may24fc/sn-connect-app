'use client';

import * as React from 'react';
import { Badge } from '../../primitives/badge';
import { cn } from '../../utils/cn';
import { SourceRow } from './SourceRow';
import { SourceFilters } from './SourceFilters';
import type { KnowledgeSource, FilterOption, AccessLevel } from '../../types/ai-knowledge.types';

export interface SourcesInventoryProps {
  sources: KnowledgeSource[];
  onAccessChange: (sourceId: string, accessLevel: AccessLevel) => void;
  className?: string;
}

export function SourcesInventory({
  sources,
  onAccessChange,
  className,
}: SourcesInventoryProps): React.ReactNode {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterOption, setFilterOption] = React.useState<FilterOption>('all');

  const filteredSources = React.useMemo(() => {
    let filtered = sources;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((source) =>
        source.fileName.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterOption !== 'all') {
      filtered = filtered.filter((source) => source.status === filterOption);
    }

    return filtered;
  }, [sources, searchQuery, filterOption]);

  return (
    <div className={cn('flex flex-col max-h-full overflow-hidden', className)}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">Documents</h3>
          <Badge variant="secondary" className="rounded-full px-2.5">
            {sources.length}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 mb-4">
        <SourceFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterOption={filterOption}
          onFilterChange={setFilterOption}
        />
      </div>

      {/* Sources List - Scrollable */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="space-y-1">
          {filteredSources.length > 0 ? (
            filteredSources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                onAccessChange={onAccessChange}
              />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm font-medium">
                {searchQuery || filterOption !== 'all'
                  ? 'No files match your filters'
                  : 'No documents uploaded'}
              </p>
              <p className="text-xs mt-1 text-muted-foreground/70">
                {searchQuery || filterOption !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Upload files above to get started'}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
    </div>
  );
}
