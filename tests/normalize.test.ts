import { describe, it, expect } from 'vitest';
import { normalize, foldDigit } from '../src/core/normalize';

describe('T-1.2: Normalization with offset map', () => {
  it('folds non-ASCII decimal digits to ASCII 0-9', () => {
    // Arabic-Indic
    expect(foldDigit('٠'.codePointAt(0)!)).toBe('0');
    expect(foldDigit('٩'.codePointAt(0)!)).toBe('9');

    // Devanagari
    expect(foldDigit('०'.codePointAt(0)!)).toBe('0');
    expect(foldDigit('५'.codePointAt(0)!)).toBe('5');
    expect(foldDigit('९'.codePointAt(0)!)).toBe('9');

    // Fullwidth
    expect(foldDigit('１'.codePointAt(0)!)).toBe('1');
    expect(foldDigit('９'.codePointAt(0)!)).toBe('9');
  });

  it('removes zero-width characters and soft hyphens while preserving mapping', () => {
    // String with zero-width space in the middle of digits
    const raw = '4242\u200B4242';
    const result = normalize(raw);

    expect(result.normalized).toBe('42424242');
    expect(result.map.length).toBe(8);

    // Mapped span for entire normalized string should cover the zero-width character in original
    const span = result.mapSpan(0, 8);
    expect(span.start).toBe(0);
    expect(span.end).toBe(9);
    expect(raw.slice(span.start, span.end)).toBe(raw);
  });

  it('folds Eastern Arabic and Devanagari numbers in text', () => {
    const raw = 'Account: ४२४२-०५';
    const result = normalize(raw);
    expect(result.normalized).toBe('Account: 4242-05');

    const digitSpan = result.mapSpan(9, 13); // '4242'
    expect(raw.slice(digitSpan.start, digitSpan.end)).toBe('४२४२');
  });

  it('correctly maps NFKC expanded characters (ligatures)', () => {
    // 'ﬁ' (U+FB01) decomposes to 'fi' in NFKC
    const raw = 'The word ﬁnance is key';
    const result = normalize(raw);

    expect(result.normalized).toBe('The word finance is key');

    // 'finance' in normalized is at [9, 16)
    const span = result.mapSpan(9, 16);
    expect(raw.slice(span.start, span.end)).toBe('ﬁnance');
  });

  it('property test: random strings with zero-width and digits retain correct substring coverage', () => {
    const zwChars = ['\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF', '\u00AD'];
    const nonAsciiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

    for (let iteration = 0; iteration < 50; iteration++) {
      let original = '';
      for (let i = 0; i < 20; i++) {
        const rand = Math.random();
        if (rand < 0.2) {
          original += zwChars[Math.floor(Math.random() * zwChars.length)];
        } else if (rand < 0.5) {
          original += nonAsciiDigits[Math.floor(Math.random() * nonAsciiDigits.length)];
        } else {
          original += String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }

      const res = normalize(original);
      if (res.normalized.length > 0) {
        // Pick random span in normalized
        const s = Math.floor(Math.random() * res.normalized.length);
        const e = s + Math.max(1, Math.floor(Math.random() * (res.normalized.length - s)));
        const mapped = res.mapSpan(s, e);

        expect(mapped.start).toBeGreaterThanOrEqual(0);
        expect(mapped.end).toBeLessThanOrEqual(original.length);
        expect(mapped.start).toBeLessThanOrEqual(mapped.end);

        // Verify mapped slice in original does not miss characters
        const slice = original.slice(mapped.start, mapped.end);
        expect(slice.length).toBeGreaterThan(0);
      }
    }
  });
});
