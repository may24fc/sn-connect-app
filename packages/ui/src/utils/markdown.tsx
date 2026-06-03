'use client';

import * as React from 'react';

export type MarkdownBlock =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'code'; code: string; lang?: string };

/**
 * Splits markdown text into paragraph and list blocks.
 * Handles blank-line separation and inline `- ` / `* ` list items.
 */
export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  for (const rawBlock of content.split(/\n{2,}/)) {
    const raw = rawBlock.replace(/\r/g, '').trim();
    if (!raw) continue;

    // Code fence block
    if (/^```/.test(raw)) {
      const fenceLines = rawBlock.split('\n');
      if (fenceLines.length === 0) continue;
      const first = (fenceLines[0] || '').trim();
      const langCandidate = first.replace(/^```\s*/, '').trim();
      const lang = langCandidate === '' ? undefined : langCandidate;
      const codeLines = fenceLines.slice(1, fenceLines.length - 1).join('\n');
      if (lang) {
        blocks.push({ type: 'code', code: codeLines, lang });
      } else {
        blocks.push({ type: 'code', code: codeLines });
      }
      continue;
    }

    const lines = rawBlock.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) continue;

    // Heading on first line (allow following paragraph lines)
    const firstLine = lines[0] ?? '';
    if (/^##\s+/.test(firstLine)) {
      blocks.push({ type: 'heading', level: 2, text: firstLine.replace(/^##\s+/, '').trim() });
      if (lines.length === 1) continue;
      // process remaining lines in this block as a paragraph/list
      const remainder = lines.slice(1);
      if (remainder.every((l) => /^>\s?/.test(l))) {
        blocks.push({ type: 'blockquote', lines: remainder.map((l) => l.replace(/^>\s?/, '').trim()) });
        continue;
      }
      // fall through to normal paragraph/list handling with remainder
      lines.splice(0, lines.length, ...remainder);
    }
    if (/^###\s+/.test(firstLine)) {
      blocks.push({ type: 'heading', level: 3, text: firstLine.replace(/^###\s+/, '').trim() });
      if (lines.length === 1) continue;
      const remainder = lines.slice(1);
      if (remainder.every((l) => /^>\s?/.test(l))) {
        blocks.push({ type: 'blockquote', lines: remainder.map((l) => l.replace(/^>\s?/, '').trim()) });
        continue;
      }
      lines.splice(0, lines.length, ...remainder);
    }

    // Blockquote (all lines starting with >)
    if (lines.every((l) => /^>\s?/.test(l))) {
      blocks.push({ type: 'blockquote', lines: lines.map((l) => l.replace(/^>\s?/, '').trim()) });
      continue;
    }

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
export function renderInlineRich(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
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
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="rounded bg-muted/30 px-1 py-[2px] font-mono text-[0.92em]"
            >
              {part.slice(1, -1)}
            </code>
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
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          if (block.level === 2) {
            return (
              <h2 key={idx} className="text-base font-semibold">
                {renderInlineRich(block.text)}
              </h2>
            );
          }
          return (
            <h3 key={idx} className="text-sm font-semibold">
              {renderInlineRich(block.text)}
            </h3>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote key={idx} className="pl-4 border-l-2 italic text-muted-foreground">
              {block.lines.map((line, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <br />}
                  {renderInlineRich(line)}
                </React.Fragment>
              ))}
            </blockquote>
          );
        }

        if (block.type === 'code') {
          return (
            <pre key={idx} className="rounded bg-muted/10 p-3 overflow-auto text-xs font-mono">
              <code>{block.code}</code>
            </pre>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={idx} className="space-y-1">
              {block.items.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-40" />
                  <span>{renderInlineRich(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        // paragraph
        return (
          <p key={idx}>
            {(block as { type: 'paragraph'; lines: string[] }).lines.map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {renderInlineRich(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
