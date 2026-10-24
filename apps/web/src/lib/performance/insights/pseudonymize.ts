import { detectMentions } from './mentions';
import { redactPersonalDetails } from './personal-details';
import { FIVE_PERCENT_AREAS, type InsightAreaAnswer, type InsightSource } from './source';

/**
 * Removes personal identifiers from insight prompts. Nothing below reaches the
 * model as written:
 *
 * 1. Personal details (links, handles, ID numbers, addresses, birth dates) are
 *    replaced with placeholders such as `[address]`; these are not restored.
 * 2. Known teammates (audience and submitters) become `Person-07`.
 * 3. Other names found in free text (family, friends, clients, places,
 *    organizations) become `Mention-003`.
 *
 * Tokens in the streamed answer are swapped back to the original names on the
 * server before text reaches the browser or the database.
 *
 * Limitation: lower-case names and names inside safe words are not detected;
 * see `mentions.ts`.
 */

export const PSEUDONYM_PREFIX = 'Person-';
export const MENTION_PREFIX = 'Mention-';
/** Mentions use a fixed width so tokens added mid-conversation stay restorable. */
const MENTION_WIDTH = 3;
/** Replacement for a name part shared by several people. */
export const AMBIGUOUS_PERSON = '[teammate]';

/** Name parts shorter than this are too likely to match ordinary words. */
const MIN_NAME_PART_LENGTH = 3;

/**
 * Single-word name parts that are also common English words. They are never
 * replaced on their own (full names that contain them still are).
 */
const COMMON_WORD_NAME_PARTS = new Set([
  'angel',
  'april',
  'august',
  'autumn',
  'bill',
  'dawn',
  'faith',
  'grace',
  'happy',
  'honey',
  'hope',
  'joy',
  'june',
  'king',
  'love',
  'lovely',
  'mark',
  'may',
  'miles',
  'person',
  'precious',
  'prince',
  'princess',
  'ray',
  'rich',
  'rose',
  'sample',
  'sky',
  'star',
  'summer',
  'sunny',
  'teammate',
  'unknown',
  'will',
  'winter',
]);

export type StreamRestorer = {
  /** Returns text that is safe to show; may hold back a partial token. */
  push: (chunk: string) => string;
  /** Returns whatever is still held back. */
  flush: () => string;
};

export type InsightPseudonymizer = {
  tokenCount: number;
  mentionCount: () => number;
  tokenForUser: (userId: string) => string | undefined;
  /** Full pass for new text (question, history); may add mention tokens. */
  pseudonymizeText: (text: string) => string;
  /** Replacement only, for reflection text whose mentions were collected when the pseudonymizer was built. */
  replaceCollected: (text: string) => string;
  restoreText: (text: string) => string;
  createStreamRestorer: () => StreamRestorer;
};

type Person = { userId: string; fullName: string; label: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matches any of `phrases` as whole words (letters and digits are word characters, including accented letters). */
function wholeWordPattern(phrases: Array<string>, flags: string): RegExp | null {
  if (phrases.length === 0) return null;
  const alternatives = [...phrases]
    .sort((a, b) => b.length - a.length)
    .map((phrase) => escapeRegExp(phrase).replace(/\s+/g, '\\s+'));
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}])`, flags);
}

function collectPeople(source: InsightSource): Array<Person> {
  const people = new Map<string, Person>();
  for (const member of source.audience) {
    people.set(member.userId, {
      userId: member.userId,
      fullName: member.fullName,
      label: member.personLabel,
    });
  }
  for (const reflection of source.reflections) {
    people.set(reflection.userId, {
      userId: reflection.userId,
      fullName: reflection.fullName,
      label: reflection.personLabel,
    });
  }

  return [...people.values()].sort(
    (a, b) => a.label.localeCompare(b.label) || a.userId.localeCompare(b.userId)
  );
}

/** Adds `key → value` unless the key already maps elsewhere, in which case it becomes ambiguous. */
function addMapping(map: Map<string, string>, key: string, value: string) {
  const existing = map.get(key);
  map.set(key, existing === undefined || existing === value ? value : AMBIGUOUS_PERSON);
}

function reflectionTexts(source: InsightSource): Array<string> {
  return source.reflections.map((reflection) =>
    [
      ...FIVE_PERCENT_AREAS.flatMap((area) => {
        const answer = reflection.areas[area];
        return [answer.feelings, answer.headline, answer.significance, answer.action];
      }),
      reflection.parkingLot,
      reflection.exploration,
    ].join('\n')
  );
}

/** Lower-cased department words, which are organisational context, not identifiers. */
function departmentWords(source: InsightSource): Set<string> {
  const words = new Set<string>();
  for (const entry of [...source.audience, ...source.reflections]) {
    for (const word of entry.department.split(/\s+/)) {
      if (word) words.add(word.toLowerCase());
    }
  }
  return words;
}

/** Builds a pattern that matches any suffix that could still grow into a token. */
function partialTokenPattern(prefixes: Array<{ prefix: string; width: number }>): RegExp {
  const alternatives = prefixes.map(({ prefix, width }) => {
    const letters = prefix.replace(/-$/, '');
    let nested = `-\\d{0,${width - 1}}`;
    for (let index = letters.length - 1; index >= 1; index -= 1) {
      nested = `${escapeRegExp(letters[index] as string)}(?:${nested})?`;
    }
    return `${escapeRegExp(letters[0] as string)}(?:${nested})?`;
  });
  return new RegExp(`(?:${alternatives.join('|')})$`, 'i');
}

/**
 * Builds a deterministic pseudonymizer for `source`. Person tokens follow
 * display-label order and mention tokens follow sorted mention text, so the
 * data block is identical across turns while the data is unchanged.
 */
export function createPseudonymizer(source: InsightSource): InsightPseudonymizer {
  const people = collectPeople(source);
  const personWidth = Math.max(2, String(people.length).length);
  const tokenByUser = new Map<string, string>();
  const originalByToken = new Map<string, string>();

  // Case-insensitive phrases: display labels and full names.
  const phraseToToken = new Map<string, string>();
  // Case-sensitive single name parts, e.g. a first name used on its own.
  const partToToken = new Map<string, string>();

  people.forEach((person, index) => {
    const token = `${PSEUDONYM_PREFIX}${String(index + 1).padStart(personWidth, '0')}`;
    tokenByUser.set(person.userId, token);
    originalByToken.set(token.toLowerCase(), person.label);

    addMapping(phraseToToken, person.label.toLowerCase(), token);
    addMapping(phraseToToken, person.fullName.toLowerCase(), token);

    for (const part of person.fullName.split(/\s+/)) {
      const bare = part.replace(/[^\p{L}\p{N}'-]/gu, '');
      if (bare.length < MIN_NAME_PART_LENGTH || COMMON_WORD_NAME_PARTS.has(bare.toLowerCase())) {
        continue;
      }
      addMapping(partToToken, bare, token);
    }
  });

  // A part that equals a whole phrase is handled by the phrase pass.
  for (const phrase of phraseToToken.keys()) {
    for (const part of [...partToToken.keys()]) {
      if (part.toLowerCase() === phrase) partToToken.delete(part);
    }
  }

  const phrasePattern = wholeWordPattern([...phraseToToken.keys()], 'giu');
  const partPattern = wholeWordPattern([...partToToken.keys()], 'gu');

  const knownPeoplePass = (text: string): string => {
    let result = redactPersonalDetails(text);
    if (phrasePattern) {
      result = result.replace(
        phrasePattern,
        (match) => phraseToToken.get(match.toLowerCase().replace(/\s+/g, ' ')) ?? match
      );
    }
    if (partPattern) {
      result = result.replace(partPattern, (match) => partToToken.get(match) ?? match);
    }
    return result;
  };

  // Mentions found in reflection text get tokens in sorted order.
  const safeWords = departmentWords(source);
  const mentionToToken = new Map<string, string>();
  let mentionPattern: RegExp | null = null;
  const addMention = (mention: string) => {
    if (mentionToToken.has(mention)) return;
    const token = `${MENTION_PREFIX}${String(mentionToToken.size + 1).padStart(MENTION_WIDTH, '0')}`;
    mentionToToken.set(mention, token);
    originalByToken.set(token.toLowerCase(), mention);
    mentionPattern = null;
  };
  const sourceMentions = new Set<string>();
  for (const text of reflectionTexts(source)) {
    for (const mention of detectMentions(knownPeoplePass(text), safeWords)) {
      sourceMentions.add(mention);
    }
  }
  for (const mention of [...sourceMentions].sort((a, b) => a.localeCompare(b))) {
    addMention(mention);
  }

  const mentionPass = (text: string): string => {
    if (mentionToToken.size === 0) return text;
    mentionPattern ??= wholeWordPattern([...mentionToToken.keys()], 'gu');
    return mentionPattern
      ? text.replace(mentionPattern, (match) => mentionToToken.get(match) ?? match)
      : text;
  };

  const replaceCollected = (text: string): string => mentionPass(knownPeoplePass(text));

  const pseudonymizeText = (text: string): string => {
    const withoutPeople = knownPeoplePass(text);
    for (const mention of detectMentions(withoutPeople, safeWords)) {
      addMention(mention);
    }
    return mentionPass(withoutPeople);
  };

  const tokenPattern = new RegExp(
    `(?:${escapeRegExp(PSEUDONYM_PREFIX)}\\d{${personWidth}}|${escapeRegExp(MENTION_PREFIX)}\\d{${MENTION_WIDTH}})(?!\\d)`,
    'gi'
  );
  const partialPattern = partialTokenPattern([
    { prefix: PSEUDONYM_PREFIX, width: personWidth },
    { prefix: MENTION_PREFIX, width: MENTION_WIDTH },
  ]);

  const restoreText = (text: string): string =>
    text.replace(tokenPattern, (match) => originalByToken.get(match.toLowerCase()) ?? match);

  return {
    tokenCount: people.length,
    mentionCount: () => mentionToToken.size,
    tokenForUser: (userId) => tokenByUser.get(userId),
    pseudonymizeText,
    restoreText,
    replaceCollected,
    createStreamRestorer: () => {
      let buffer = '';
      return {
        push: (chunk) => {
          buffer += chunk;
          const partial = partialPattern.exec(buffer);
          const holdFrom = partial ? partial.index : buffer.length;
          const ready = buffer.slice(0, holdFrom);
          buffer = buffer.slice(holdFrom);
          return restoreText(ready);
        },
        flush: () => {
          const rest = restoreText(buffer);
          buffer = '';
          return rest;
        },
      };
    },
  };
}

function pseudonymizeAnswer(answer: InsightAreaAnswer, replace: (text: string) => string) {
  return {
    feelings: replace(answer.feelings),
    headline: replace(answer.headline),
    significance: replace(answer.significance),
    action: replace(answer.action),
    rank: answer.rank,
  };
}

/** Returns a copy of `source` with every detected identifier replaced. */
export function pseudonymizeSource(
  source: InsightSource,
  pseudonymizer: InsightPseudonymizer
): InsightSource {
  const tokenFor = (userId: string) => pseudonymizer.tokenForUser(userId) ?? AMBIGUOUS_PERSON;
  // Reflection mentions were collected when the pseudonymizer was built.
  const replace = pseudonymizer.replaceCollected;

  return {
    ...source,
    audience: source.audience.map((member) => ({
      ...member,
      fullName: tokenFor(member.userId),
      personLabel: tokenFor(member.userId),
    })),
    reflections: source.reflections.map((reflection) => ({
      ...reflection,
      fullName: tokenFor(reflection.userId),
      personLabel: tokenFor(reflection.userId),
      areas: Object.fromEntries(
        FIVE_PERCENT_AREAS.map((area) => [
          area,
          pseudonymizeAnswer(reflection.areas[area], replace),
        ])
      ) as Record<(typeof FIVE_PERCENT_AREAS)[number], InsightAreaAnswer>,
      parkingLot: replace(reflection.parkingLot),
      exploration: replace(reflection.exploration),
    })),
  };
}
