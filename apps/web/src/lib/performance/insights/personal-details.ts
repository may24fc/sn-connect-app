/**
 * Redacts personal details that are not names: links, social handles, ID-like
 * numbers, street addresses, and birth dates. Runs after `stripPotentialPii`
 * (emails and phone numbers) and before name tokenization. Placeholders are
 * not restored in answers.
 */

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
const HANDLE_PATTERN = /(?<![\p{L}\p{N}._%+-])@[A-Za-z0-9_.]{2,}/gu;
/** Seven or more digits, optionally separated by spaces or dashes (IDs, account numbers). */
const ID_NUMBER_PATTERN = /(?<![\p{L}\p{N}])\d(?:[\s-]?\d){6,}(?![\p{L}\p{N}])/gu;

const STREET_SUFFIX =
  '(?:Street|St\\.?|Avenue|Ave\\.?|Road|Rd\\.?|Boulevard|Blvd\\.?|Drive|Dr\\.?|Lane|Ln\\.?|Highway|Hwy\\.?|Extension|Ext\\.?)';
/** "123 Mabini Street", "45-B Rizal Ave." */
const STREET_ADDRESS_PATTERN = new RegExp(
  `\\b\\d{1,5}(?:-?[A-Za-z])?\\s+(?:\\p{Lu}[\\p{L}.'-]*\\s+){1,4}${STREET_SUFFIX}(?![\\p{L}])`,
  'gu'
);
/** "Blk 5", "Lot 12", "Unit 4B", "Phase 2" (numbered only, so "Unit Head" is untouched). */
const NUMBERED_ADDRESS_PATTERN = /\b(?:Blk|Block|Lot|Phase|Unit)\s*\d+[A-Za-z]?\b/gu;
/** "Purok 3", "Brgy. San Isidro", "Barangay Malinis". */
const BARANGAY_PATTERN =
  /\b(?:Purok|Brgy\.?|Barangay)\s*(?:\d+[A-Za-z]?|\p{Lu}[\p{L}'-]*(?:\s+\p{Lu}[\p{L}'-]*){0,2})/gu;

const MONTH =
  '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?';
/** A date that follows a birth keyword within a few words. */
const BIRTH_DATE_PATTERN = new RegExp(
  `\\b(born|birthday|bday|birth date|date of birth|DOB)\\b([^.!?\\n]{0,24}?)(${MONTH}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}\\s+${MONTH}(?:,?\\s*\\d{4})?|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})`,
  'giu'
);

export function redactPersonalDetails(text: string): string {
  return text
    .replace(URL_PATTERN, '[url]')
    .replace(HANDLE_PATTERN, '[handle]')
    .replace(
      BIRTH_DATE_PATTERN,
      (_match, keyword: string, gap: string) => `${keyword}${gap}[birth-date]`
    )
    .replace(STREET_ADDRESS_PATTERN, '[address]')
    .replace(NUMBERED_ADDRESS_PATTERN, '[address]')
    .replace(BARANGAY_PATTERN, '[address]')
    .replace(ID_NUMBER_PATTERN, '[id-number]');
}
