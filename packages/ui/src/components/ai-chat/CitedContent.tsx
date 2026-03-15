'use client';

import * as React from 'react';
import { parseMarkdownBlocks } from '../../utils/markdown';
import { cn } from '../../utils/cn';
import { CitationBadge } from './CitationBadge';
import { type Citation, getCitationById } from './citation-utils';

export interface CitedContentProps {
  /** The text content potentially containing **bold** and [n] citation markers */
  content: string;
  /** Array of citations to match against markers */
  citations: Citation[];
  /** Callback when a citation badge is clicked */
  onCitationClick?: (id: number) => void;
  /** Custom class name for the container */
  className?: string;
}

/**
 * Renders a single line of text with inline bold (**text**) and citation ([n]) markers.
 */
function renderLineCited(
  text: string,
  citations: Citation[],
  onCitationClick?: (id: number) => void,
): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        const citMatch = part.match(/^\[(\d+)\]$/);
        if (citMatch) {
          const citId = parseInt(citMatch[1] ?? '0', 10);
          return (
            <CitationBadge
              key={i}
              citationId={citId}
              citation={getCitationById(citations, citId)}
              onCitationClick={onCitationClick}
            />
          );
        }
        return part ? <React.Fragment key={i}>{part}</React.Fragment> : null;
      })}
    </>
  );
}

/**
 * Renders AI response text as clean markdown (paragraphs, bullet lists, bold)
 * with inline citation badges replacing [n] markers.
 */
export function CitedContent({
  content,
  citations,
  onCitationClick,
  className,
}: CitedContentProps): React.ReactNode {
  const blocks = React.useMemo(() => parseMarkdownBlocks(content), [content]);

  return (
    <div className={cn('text-sm leading-relaxed space-y-2', className)}>
      {blocks.map((block, idx) =>
        block.type === 'list' ? (
          <ul key={idx} className="space-y-1">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-40" />
                <span>{renderLineCited(item, citations, onCitationClick)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={idx}>
            {block.lines.map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {renderLineCited(line, citations, onCitationClick)}
              </React.Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}

