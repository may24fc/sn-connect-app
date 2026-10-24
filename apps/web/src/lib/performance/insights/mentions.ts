import nlp from 'compromise';

/**
 * Finds names in free text that are not known teammates: family members,
 * friends, clients, places, and organizations. Runs locally (no network).
 *
 * Two signals are combined:
 * - Capitalized words in the middle of a sentence are treated as names. This
 *   catches unfamiliar names and nicknames that a lexicon would miss.
 * - Capitalized words that start a sentence count only when compromise tags
 *   them as a person, place, or organization, so "Shipped …" is left alone.
 *
 * Relationship words and honorifics (Tita, Kuya, Sir) are kept as context and
 * only the name after them is returned. Lower-case names are not detected.
 */

/** Context words kept in the text; the name that follows them is still tokenized. */
const CONTEXT_WORDS = new Set([
  'ate',
  'atty',
  'aunt',
  'auntie',
  'baby',
  'boss',
  'brother',
  'client',
  'coach',
  'cousin',
  'dad',
  'daddy',
  'doc',
  'dr',
  'engr',
  'father',
  'grandma',
  'grandpa',
  'i',
  "i'd",
  "i'll",
  "i'm",
  "i've",
  'kuya',
  'lola',
  'lolo',
  "ma'am",
  'maam',
  'madam',
  'mama',
  'manang',
  'manong',
  'miss',
  'mom',
  'mommy',
  'mother',
  'mr',
  'mrs',
  'ms',
  'nanay',
  'papa',
  'pastor',
  'prof',
  'sir',
  'sister',
  'tatay',
  'tita',
  'tito',
  'uncle',
]);

/** Capitalized words that are not personal identifiers. */
const SAFE_WORDS = new Set([
  // Calendar
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'christmas',
  'easter',
  'halloween',
  'undas',
  'valentine',
  "valentine's",
  'new',
  'year',
  'holy',
  'week',
  'lent',
  'ramadan',
  'eid',
  'thanksgiving',
  // Faith
  'god',
  'lord',
  'jesus',
  'christ',
  'bible',
  'church',
  'allah',
  // Countries, nationalities, languages
  'philippines',
  'filipino',
  'filipina',
  'pinoy',
  'tagalog',
  'english',
  'australia',
  'australian',
  'asia',
  // Company, product, and role terms
  'sn',
  'control',
  'hub',
  'uhp',
  'okr',
  'okrs',
  'kpi',
  'kpis',
  'ai',
  'hr',
  'it',
  'ceo',
  'coo',
  'cfo',
  'cto',
  'qa',
  'pm',
  'va',
  'ea',
  'ops',
  'team',
  'reflection',
  'reflections',
  // Common workplace tools
  'google',
  'gmail',
  'docs',
  'sheets',
  'drive',
  'slack',
  'zoom',
  'teams',
  'microsoft',
  'excel',
  'word',
  'powerpoint',
  'outlook',
  'telegram',
  'messenger',
  'facebook',
  'instagram',
  'tiktok',
  'linkedin',
  'youtube',
  'canva',
  'notion',
  'clickup',
  'trello',
  'asana',
  'jira',
  'figma',
  'github',
  'supabase',
  'vercel',
  'chatgpt',
  'openai',
  'claude',
  'gemini',
  'n8n',
  'apple',
  'iphone',
  'android',
  'windows',
]);

/** Tokens and placeholders produced by earlier passes. */
const PLACEHOLDER_PATTERN = /(?:Person|Mention)-\d+|\[[a-z-]+\]/g;
/** A run of capitalized words on one line; runs never cross field or line breaks. */
const CAPITALIZED_RUN = /\p{Lu}[\p{L}'’-]*(?:[ \t]+\p{Lu}[\p{L}'’-]*)*/gu;
/** Characters after which a capitalized word starts a sentence, line, or field. */
const SENTENCE_START_CHARACTERS = new Set(['.', '!', '?', ':', ';', '\n', '"', '“', '(']);

function bareWord(word: string): string {
  const trimmed = word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
  return trimmed.replace(/['’]s$/i, '');
}

function isAcronym(word: string): boolean {
  return word.length <= 5 && word === word.toUpperCase();
}

/** Splits a capitalized run into name phrases, dropping context and safe words. */
function namePhrases(run: string, extraSafe: Set<string>, keepFirstWord: boolean): Array<string> {
  const words = run.split(/\s+/).map(bareWord).filter(Boolean);
  const phrases: Array<string> = [];
  let current: Array<string> = [];

  words.forEach((word, index) => {
    const lower = word.toLowerCase();
    const skip =
      (index === 0 && !keepFirstWord) ||
      CONTEXT_WORDS.has(lower.replace(/\.$/, '')) ||
      SAFE_WORDS.has(lower) ||
      extraSafe.has(lower) ||
      isAcronym(word);

    if (skip) {
      if (current.length > 0) phrases.push(current.join(' '));
      current = [];
      return;
    }
    current.push(word);
  });
  if (current.length > 0) phrases.push(current.join(' '));

  return phrases.filter((phrase) => phrase.length >= 2);
}

const LEXICON_CACHE_LIMIT = 5000;
const lexiconCache = new Map<string, boolean>();

/**
 * Whether compromise's lexicon knows `word` as a person, place, or
 * organization. Only sentence-initial words need this, and the answers are
 * cached per word: parsing whole reflections took seconds per request.
 */
function isLexiconName(word: string): boolean {
  const key = word.toLowerCase();
  const cached = lexiconCache.get(key);
  if (cached !== undefined) return cached;

  const result = nlp(word).has('(#Person|#Place|#Organization)');
  if (lexiconCache.size >= LEXICON_CACHE_LIMIT) lexiconCache.clear();
  lexiconCache.set(key, result);
  return result;
}

/** Whether `index` begins a sentence, line, or field (scans back over spaces only). */
function startsSentence(text: string, index: number): boolean {
  let cursor = index - 1;
  while (cursor >= 0 && (text[cursor] === ' ' || text[cursor] === '\t')) cursor -= 1;
  return cursor < 0 || SENTENCE_START_CHARACTERS.has(text[cursor] as string);
}

/**
 * Returns the distinct name phrases mentioned in `text`. `extraSafe` holds
 * additional lower-cased words to ignore, such as department names.
 */
export function detectMentions(text: string, extraSafe: Set<string> = new Set()): Array<string> {
  const masked = text.replace(PLACEHOLDER_PATTERN, (token) => ' '.repeat(token.length));
  if (!/\p{Lu}/u.test(masked)) return [];

  const found = new Set<string>();

  for (const match of masked.matchAll(CAPITALIZED_RUN)) {
    const firstWord = bareWord(match[0].split(/\s+/)[0] ?? '');
    const keepFirstWord = !startsSentence(masked, match.index ?? 0) || isLexiconName(firstWord);

    for (const phrase of namePhrases(match[0], extraSafe, keepFirstWord)) {
      found.add(phrase);
    }
  }

  return [...found];
}
