/**
 * Citation types for AI-generated content with inline source references.
 */

export interface Citation {
  /** Numeric ID matching the [n] marker in the text (1-indexed) */
  id: number;
  /** UUID of the source document */
  sourceId: string;
  /** Display name of the source (e.g., "Employee Handbook.pdf") */
  sourceName: string;
  /** Verbatim excerpt from the source document */
  exactQuote: string;
  /** Similarity/relevance score (0-1) */
  relevanceScore: number;
}

export interface ParsedSegment {
  type: 'text' | 'citation';
  content: string;
  citationId?: number;
}

/**
 * Parse text containing [n] citation markers into segments.
 * Example: "Annual leave is 15 days [1] and sick leave [2] is unlimited."
 * Returns: [
 *   { type: 'text', content: 'Annual leave is 15 days ' },
 *   { type: 'citation', content: '[1]', citationId: 1 },
 *   { type: 'text', content: ' and sick leave ' },
 *   { type: 'citation', content: '[2]', citationId: 2 },
 *   { type: 'text', content: ' is unlimited.' }
 * ]
 */
export function parseCitations(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  // Match [n] where n is one or more digits
  const citationRegex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = citationRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    // Add text before the citation (if any)
    if (matchIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, matchIndex),
      });
    }

    // Add the citation marker
    segments.push({
      type: 'citation',
      content: match[0], // e.g., "[1]"
      citationId: parseInt(match[1] ?? '0', 10),
    });

    lastIndex = matchIndex + match[0].length;
  }

  // Add remaining text after the last citation
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  // If no citations found, return the whole text as a single segment
  if (segments.length === 0) {
    return [{ type: 'text', content: text }];
  }

  return segments;
}

/**
 * Get a citation by ID from the citations array.
 */
export function getCitationById(citations: Citation[], id: number): Citation | undefined {
  return citations.find((c) => c.id === id);
}

/**
 * Get all unique citation IDs from parsed segments.
 */
export function getUsedCitationIds(segments: ParsedSegment[]): number[] {
  const ids = new Set<number>();
  for (const segment of segments) {
    if (segment.type === 'citation' && segment.citationId !== undefined) {
      ids.add(segment.citationId);
    }
  }
  return Array.from(ids).sort((a, b) => a - b);
}
