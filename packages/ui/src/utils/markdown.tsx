'use client';

import * as React from 'react';

export type MarkdownBlock =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'code'; code: string; lang?: string };

/**
 * Splits markdown text into paragraph and list blocks.
 * Handles blank-line separation and inline `- ` / `* ` list items.
 */
export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.replace(/\r/g, '').split('\n');
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let quoteLines: string[] = [];
  let codeFenceLang: string | undefined;
  let codeLines: string[] = [];

  function flushParagraph(): void {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: [...paragraphLines] });
      paragraphLines = [];
    }
  }

  function flushList(): void {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: [...listItems] });
      listItems = [];
    }
  }

  function flushQuote(): void {
    if (quoteLines.length > 0) {
      blocks.push({ type: 'blockquote', lines: [...quoteLines] });
      quoteLines = [];
    }
  }

  function flushAll(): void {
    flushParagraph();
    flushList();
    flushQuote();
  }

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    if (codeFenceLang !== undefined) {
      if (/^```/.test(trimmedLine)) {
        blocks.push(
          codeFenceLang
            ? { type: 'code', code: codeLines.join('\n'), lang: codeFenceLang }
            : { type: 'code', code: codeLines.join('\n') }
        );
        codeFenceLang = undefined;
        codeLines = [];
      } else {
        codeLines.push(rawLine);
      }
      continue;
    }

    if (/^```/.test(trimmedLine)) {
      flushAll();
      const langCandidate = trimmedLine.replace(/^```\s*/, '').trim();
      codeFenceLang = langCandidate === '' ? '' : langCandidate;
      codeLines = [];
      continue;
    }

    if (trimmedLine === '') {
      flushAll();
      continue;
    }

    const headingMatch = trimmedLine.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      flushAll();
      const headingHashes = headingMatch[1] ?? '##';
      const headingText = headingMatch[2] ?? '';
      blocks.push({
        type: 'heading',
        level: headingHashes.length as 2 | 3 | 4,
        text: headingText.trim(),
      });
      continue;
    }

    if (/^>\s?/.test(trimmedLine)) {
      flushParagraph();
      flushList();
      quoteLines.push(trimmedLine.replace(/^>\s?/, '').trim());
      continue;
    }

    if (/^[-*]\s+/.test(trimmedLine)) {
      flushParagraph();
      flushQuote();
      listItems.push(trimmedLine.replace(/^[-*]\s+/, ''));
      continue;
    }

    flushList();
    flushQuote();
    paragraphLines.push(trimmedLine);
  }

  if (codeFenceLang !== undefined) {
    blocks.push(
      codeFenceLang
        ? { type: 'code', code: codeLines.join('\n'), lang: codeFenceLang }
        : { type: 'code', code: codeLines.join('\n') }
    );
  }

  flushAll();
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
          if (block.level === 3) {
            return (
              <h3 key={idx} className="text-sm font-semibold">
                {renderInlineRich(block.text)}
              </h3>
            );
          }
          return (
            <h4 key={idx} className="text-sm font-medium text-foreground/85">
              {renderInlineRich(block.text)}
            </h4>
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
