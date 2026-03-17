'use client';

import { ChevronDown, ChevronRight, Clock, FileText, RotateCcw, User } from 'lucide-react';
import { useState } from 'react';

// ===== Types =====

export interface VersionRecord {
  id: string;
  version_number: number;
  title: string;
  content: string;
  changed_by: string;
  changed_by_name: string;
  change_summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface VersionHistoryProps {
  sourceId: string;
  sourceTitle: string;
  currentVersion: number;
  versions: VersionRecord[];
  isLoading?: boolean;
  onRestore?: (versionNumber: number) => void;
  isRestoring?: boolean;
}

// ===== Helper Functions =====

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function computeSimpleDiff(
  oldText: string,
  newText: string
): { added: number; removed: number; unchanged: number } {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let added = 0;
  let removed = 0;

  for (const line of newLines) {
    if (!oldSet.has(line)) added++;
  }
  for (const line of oldLines) {
    if (!newSet.has(line)) removed++;
  }

  return {
    added,
    removed,
    unchanged: Math.max(0, oldLines.length - removed),
  };
}

// ===== Sub-Components =====

function DiffView({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Simple line-by-line diff
  const maxLen = Math.max(oldLines.length, newLines.length);
  const diffLines: Array<{ type: 'added' | 'removed' | 'unchanged'; content: string }> = [];

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine === newLine) {
      diffLines.push({ type: 'unchanged', content: oldLine || '' });
    } else {
      if (oldLine !== undefined) {
        diffLines.push({ type: 'removed', content: oldLine });
      }
      if (newLine !== undefined) {
        diffLines.push({ type: 'added', content: newLine });
      }
    }
  }

  return (
    <div className="max-h-64 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900">
      {diffLines.map((line, i) => (
        <div
          key={i}
          className={
            line.type === 'added'
              ? 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300'
              : line.type === 'removed'
                ? 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
                : 'text-zinc-600 dark:text-zinc-400'
          }
        >
          <span className="inline-block w-6 select-none text-right text-zinc-400 dark:text-zinc-600">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          <span className="pl-2">{line.content || '\u00A0'}</span>
        </div>
      ))}
    </div>
  );
}

function VersionItem({
  version,
  isLatest,
  isCurrent,
  nextVersion,
  onRestore,
  isRestoring,
}: {
  version: VersionRecord;
  isLatest: boolean;
  isCurrent: boolean;
  nextVersion?: VersionRecord | undefined;
  onRestore?: ((versionNumber: number) => void) | undefined;
  isRestoring?: boolean | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const diff = nextVersion ? computeSimpleDiff(version.content, nextVersion.content) : null;

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div
        className={`absolute left-0 top-2 h-3 w-3 rounded-full border-2 ${
          isCurrent
            ? 'border-slate-500 bg-slate-800'
            : 'border-zinc-300 bg-card dark:border-zinc-600'
        }`}
      />

      <div className="rounded-lg border border-border bg-card p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-sm font-medium text-zinc-900 hover:text-slate-700 dark:text-zinc-100 dark:hover:text-slate-400"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Version {version.version_number}
              </button>
              {isCurrent && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  Current
                </span>
              )}
              {isLatest && !isCurrent && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  Latest Saved
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {version.changed_by_name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(version.created_at)}
              </span>
            </div>

            {version.title && (
              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300">
                <FileText className="h-3 w-3" />
                {version.title}
              </p>
            )}

            {version.change_summary && (
              <p className="mt-1 text-xs text-zinc-500 italic dark:text-zinc-400">
                {version.change_summary}
              </p>
            )}

            {diff && (
              <div className="mt-1 flex items-center gap-2 text-xs">
                {diff.added > 0 && (
                  <span className="text-green-600 dark:text-green-400">+{diff.added} lines</span>
                )}
                {diff.removed > 0 && (
                  <span className="text-red-600 dark:text-red-400">-{diff.removed} lines</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {nextVersion && (
              <button
                type="button"
                onClick={() => setShowDiff(!showDiff)}
                className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {showDiff ? 'Hide Diff' : 'Show Diff'}
              </button>
            )}
            {!isCurrent && onRestore && (
              <button
                type="button"
                onClick={() => onRestore(version.version_number)}
                disabled={isRestoring}
                className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-950/30"
              >
                <RotateCcw className="h-3 w-3" />
                Restore
              </button>
            )}
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {version.content || '(empty content)'}
            </pre>
          </div>
        )}

        {/* Diff view */}
        {showDiff && nextVersion && (
          <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Changes from v{version.version_number} → v{nextVersion.version_number}
            </p>
            <DiffView oldContent={version.content} newContent={nextVersion.content} />
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Main Component =====

export function VersionHistory({
  sourceTitle,
  currentVersion,
  versions,
  isLoading,
  onRestore,
  isRestoring,
}: VersionHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 animate-pulse" />
          Loading version history...
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          No version history
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Version history will appear here after the first edit to &ldquo;{sourceTitle}&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Version History
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {versions.length} version{versions.length !== 1 ? 's' : ''} • Current: v{currentVersion}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative space-y-4">
        {/* Timeline line */}
        <div className="absolute bottom-0 left-[5px] top-0 w-0.5 bg-zinc-200 dark:bg-zinc-700" />

        {versions.map((version, index) => (
          <VersionItem
            key={version.id}
            version={version}
            isLatest={index === 0}
            isCurrent={version.version_number === currentVersion - 1}
            nextVersion={index > 0 ? versions[index - 1] : undefined}
            onRestore={onRestore}
            isRestoring={isRestoring}
          />
        ))}
      </div>
    </div>
  );
}
