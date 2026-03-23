'use client';

import { ExternalLink, FileText, Link2, MessageSquare, Trash2 } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import type { KPIEvidenceType } from '../../types/performance.types';
import { cn } from '../../utils/cn';

export interface KPIEvidenceItem {
  id: string;
  kpiId: string;
  submittedBy: string;
  evidenceType: KPIEvidenceType;
  content: string;
  label: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  submittedByName: string;
}

interface KPIEvidenceSectionProps {
  evidence: KPIEvidenceItem[];
  isOwner?: boolean;
  onDelete?: (evidenceId: string) => void;
  className?: string;
}

const EVIDENCE_TYPE_CONFIG: Record<
  KPIEvidenceType,
  { icon: React.ElementType; label: string; variant: 'secondary' | 'success' | 'warning' }
> = {
  link: { icon: Link2, label: 'Link', variant: 'secondary' },
  note: { icon: MessageSquare, label: 'Note', variant: 'warning' },
  file: { icon: FileText, label: 'File', variant: 'success' },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function KPIEvidenceSection({
  evidence,
  isOwner = false,
  onDelete,
  className,
}: KPIEvidenceSectionProps): React.ReactNode {
  if (evidence.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No evidence submitted yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Evidence ({evidence.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {evidence.map((item) => {
          const config = EVIDENCE_TYPE_CONFIG[item.evidenceType];
          const Icon = config.icon;

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30"
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  item.evidenceType === 'link' && 'bg-primary/10 text-primary',
                  item.evidenceType === 'note' && 'bg-warning/10 text-warning',
                  item.evidenceType === 'file' && 'bg-success/10 text-success'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={config.variant} className="text-xs">
                    {config.label}
                  </Badge>
                  {item.label && <span className="text-sm font-medium truncate">{item.label}</span>}
                </div>

                {item.evidenceType === 'link' && (
                  <a
                    href={item.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                  >
                    {item.content}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}

                {item.evidenceType === 'note' && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.content}</p>
                )}

                {item.evidenceType === 'file' && (
                  <div className="text-sm">
                    <span className="font-medium">{item.fileName || 'File'}</span>
                    {item.fileSize && (
                      <span className="text-muted-foreground ml-2">
                        ({formatFileSize(item.fileSize)})
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {item.submittedByName} · {formatDate(item.createdAt)}
                </p>
              </div>

              {isOwner && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-error shrink-0"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
