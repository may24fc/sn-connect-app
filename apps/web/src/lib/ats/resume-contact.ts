export function extractApplicantContactInfoFromResumeText(text: string): {
  email?: string;
  full_name?: string;
} {
  const updates: {
    email?: string;
    full_name?: string;
  } = {};

  const emailMatch = text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
  if (emailMatch) {
    const extracted = emailMatch[0].toLowerCase();
    if (!extracted.endsWith('@example.com') && !extracted.endsWith('@placeholder.local')) {
      updates.email = extracted;
    }
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 10)) {
    const clean = line.replace(/^#+\s*/, '').trim();
    const words = clean.split(/\s+/);

    if (
      clean.length >= 3 &&
      clean.length <= 60 &&
      !/\d/.test(clean) &&
      !clean.includes('@') &&
      !clean.includes('http') &&
      !clean.includes(':') &&
      words.length >= 2 &&
      words.length <= 5
    ) {
      updates.full_name = clean;
      break;
    }
  }

  return updates;
}