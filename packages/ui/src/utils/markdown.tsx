'use client';

import * as React from 'react';

export type MarkdownBlock =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'list'; items: string[] };

/**
 * Splits markdown text into paragraph and list blocks.
 * Handles blank-line separation and inline `- ` / `* ` list items.
 */
export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  for (const rawBlock of content.split(/\n{2,}/)) {
    const lines = rawBlock.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) continue;

    let listItems: string[] = [];
    let paraLines: string[] = [];

    for (const line of lines) {
      if (/^[-*]\s/.test(line)) {
        if (paraLines.length > 0) {
          blocks.push({ type: 'paragraph', lines: [...paraLines] });
          paraLines = [];
        }
        listItems.push(line.replace(/^[-*]\s+/, ''));
      } else {
        if (listItems.length > 0) {
          blocks.push({ type: 'list', items: [...listItems] });
          listItems = [];
        }
        paraLines.push(line);
      }
    }

    if (listItems.length > 0) blocks.push({ type: 'list', items: listItems });
    if (paraLines.length > 0) blocks.push({ type: 'paragraph', lines: paraLines });
  }
  return blocks;
}

/** Renders **bold** inline markdown within a plain text string. */
export function renderInlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
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
        return part ? <React.Fragment key={i}>{part}</React.Fragment> : null;
      })}
    </>
  );
}

/**
 * Renders AI response text as clean markdown — paragraphs, bullet lists, inline bold.
 * No external dependencies.
 */
export function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}): React.ReactNode {
  const blocks = React.useMemo(() => parseMarkdownBlocks(content), [content]);
  return (
    <div
      className={['text-sm leading-relaxed space-y-2', className].filter(Boolean).join(' ')}
    >
      {blocks.map((block, idx) =>
        block.type === 'list' ? (
          <ul key={idx} className="space-y-1">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-40" />
                <span>{renderInlineBold(item)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={idx}>
            {block.lines.map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {renderInlineBold(line)}
              </React.Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}
