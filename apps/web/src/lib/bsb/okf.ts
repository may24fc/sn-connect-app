export interface OkfFact {
  id: string;
  exactQuote: string;
}

export interface OkfV02 {
  version: '0.2';
  sourceText: string;
  facts: OkfFact[];
}

// Deterministic draft parser: preserve source text verbatim. No model sees an unapproved note.
export function parseOkfV02(text: string): OkfV02 {
  if (text.trim().length < 20 || text.length > 200_000) {
    throw new Error('The Google Doc must contain 20 to 200,000 characters.');
  }
  const facts = text.split(/\r?\n\s*\r?\n/).map((part) => part.trim()).filter(Boolean)
    .flatMap((part) => part.length <= 1200 ? [part] : part.match(/[\s\S]{1,1200}/g) ?? [])
    .map((exactQuote, index) => ({ id: `F${index + 1}`, exactQuote }));
  if (facts.length === 0 || facts.length > 300) throw new Error('Unsupported document size.');
  return { version: '0.2', sourceText: text, facts };
}

export function isOkfV02(value: unknown): value is OkfV02 {
  if (!value || typeof value !== 'object') return false;
  const okf = value as Partial<OkfV02>;
  return okf.version === '0.2' && typeof okf.sourceText === 'string'
    && okf.sourceText.length >= 20 && okf.sourceText.length <= 200_000
    && Array.isArray(okf.facts)
    && okf.facts.length > 0 && okf.facts.length <= 300
    && okf.facts.every((fact) => typeof fact.id === 'string' && typeof fact.exactQuote === 'string'
      && fact.exactQuote.length > 0 && okf.sourceText?.includes(fact.exactQuote));
}

export function normalizePrincipal(email: string): string {
  return email.trim().toLowerCase();
}

// Google returns `...Z`; PostgREST serializes timestamptz as `...+00:00`. Compare instants, fail closed.
export function isSameInstant(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Date.parse(a);
  const right = Date.parse(b);
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

export function isPublishable(row: Record<string, unknown>, now = new Date()): boolean {
  const required = ['source_owner_email', 'classification'];
  return required.every((key) => typeof row[key] === 'string' && Boolean((row[key] as string).trim()))
    && row.processor === 'openai' // This release has an OpenAI integration only.
    && typeof row.acl_checked_at === 'string'
    && (row.retention_rule === 'never' ||
      (row.retention_rule === 'until' && typeof row.retention_until === 'string'
        && new Date(row.retention_until).getTime() > now.getTime()))
    && (row.expires_at == null || (typeof row.expires_at === 'string'
      && new Date(row.expires_at).getTime() > now.getTime()))
    && Array.isArray(row.allowed_principals) && row.allowed_principals.length > 0
    && isOkfV02(row.okf);
}
