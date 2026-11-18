/**
 * Normalization with Offset Map
 * Refines docs/09-DETECTOR-SPEC.md §3.
 *
 * Rules:
 * 1. Unicode NFKC (folds full-width digits and compatibility characters).
 * 2. Fold non-ASCII decimal digits (Arabic-Indic, Devanagari, etc.) to ASCII 0-9.
 * 3. Remove zero-width characters (U+200B, U+200C, U+200D, U+2060, U+FEFF) and soft hyphen U+00AD.
 * 4. Do NOT collapse whitespace or change case.
 *
 * Provides exact mapping from normalized string offsets back to original text offsets.
 */

export interface NormalizedResult {
  normalized: string;
  original: string;
  /**
   * map[i] is the code unit index in `original` corresponding to code unit `i` in `normalized`.
   */
  map: number[];
  /**
   * Translates a span [start, end) found in `normalized` back to [start, end) in `original`.
   */
  mapSpan(start: number, end: number): { start: number; end: number };
}

// Zero-width characters and soft-hyphen to remove
const ZERO_WIDTH_CODEPOINTS = new Set([
  0x200b, // Zero-width space
  0x200c, // Zero-width non-joiner
  0x200d, // Zero-width joiner
  0x2060, // Word joiner
  0xfeff, // Zero-width no-break space / BOM
  0x00ad, // Soft hyphen
]);

// Unicode decimal digit block zero codepoints
const DECIMAL_ZERO_STARTS = [
  0x0030, // ASCII 0
  0x0660, // Arabic-Indic
  0x06f0, // Extended Arabic-Indic (Persian/Urdu)
  0x07c0, // NKo
  0x0966, // Devanagari
  0x09e6, // Bengali
  0x0a66, // Gurmukhi
  0x0ae6, // Gujarati
  0x0b66, // Oriya
  0x0be6, // Tamil
  0x0c66, // Telugu
  0x0ce6, // Kannada
  0x0d66, // Malayalam
  0x0de6, // Sinhala
  0x0e50, // Thai
  0x0ed0, // Lao
  0x0f20, // Tibetan
  0x1040, // Myanmar
  0x1090, // Myanmar Shan
  0x17e0, // Khmer
  0x1810, // Mongolian
  0x1946, // Limbu
  0x19d0, // New Tai Lue
  0x1a80, // Tai Tham Hora
  0x1a90, // Tai Tham Tham
  0x1b50, // Balinese
  0x1bb0, // Sundanese
  0x1c40, // Lepcha
  0x1c50, // Ol Chiki
  0xa620, // Vai
  0xa8d0, // Saurashtra
  0xa900, // Kayah Li
  0xa9d0, // Javanese
  0xaa50, // Cham
  0xabf0, // Meetei Mayek
  0xff10, // Fullwidth digits
];

/**
 * Folds any unicode decimal digit to ASCII '0'..'9'. Returns null if not a decimal digit.
 */
export function foldDigit(codePoint: number): string | null {
  for (const zero of DECIMAL_ZERO_STARTS) {
    if (codePoint >= zero && codePoint <= zero + 9) {
      return String.fromCharCode(48 + (codePoint - zero));
    }
  }
  return null;
}

/**
 * Normalizes input text while constructing a forward code unit offset map.
 */
export function normalize(original: string): NormalizedResult {
  const normChars: string[] = [];
  const map: number[] = [];

  let i = 0;
  while (i < original.length) {
    const codePoint = original.codePointAt(i);
    if (codePoint === undefined) break;

    const codeUnitLen = codePoint > 0xffff ? 2 : 1;
    const origIndex = i;
    i += codeUnitLen;

    // Rule 3: Skip zero-width characters and soft hyphens
    if (ZERO_WIDTH_CODEPOINTS.has(codePoint)) {
      continue;
    }

    // Rule 2: Fold non-ASCII decimal digits to ASCII 0-9
    const folded = foldDigit(codePoint);
    if (folded !== null) {
      normChars.push(folded);
      map.push(origIndex);
      continue;
    }

    // Rule 1: Unicode NFKC decomposition for compatibility characters
    const charStr = String.fromCodePoint(codePoint);
    const nfkc = charStr.normalize('NFKC');

    for (let c = 0; c < nfkc.length; c++) {
      normChars.push(nfkc[c]);
      map.push(origIndex);
    }
  }

  const normalized = normChars.join('');

  return {
    normalized,
    original,
    map,
    mapSpan(start: number, end: number) {
      if (start >= end || normalized.length === 0) {
        const mappedStart = start < map.length ? map[start] : original.length;
        return { start: mappedStart, end: mappedStart };
      }

      const clampedStart = Math.max(0, Math.min(start, map.length - 1));
      const clampedEndMinusOne = Math.max(0, Math.min(end - 1, map.length - 1));

      const origStart = map[clampedStart];
      const lastOrigUnit = map[clampedEndMinusOne];

      // If the last code point was a surrogate pair, it spans 2 code units in original
      let origEnd = lastOrigUnit + 1;
      if (
        lastOrigUnit < original.length - 1 &&
        original.charCodeAt(lastOrigUnit) >= 0xd800 &&
        original.charCodeAt(lastOrigUnit) <= 0xdbff
      ) {
        origEnd = lastOrigUnit + 2;
      }

      return { start: origStart, end: origEnd };
    },
  };
}
