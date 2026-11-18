import { describe, it, expect } from 'vitest';
import { asRawText, brandSanitizedText } from '../src/shared/types';

describe('Smoke test', () => {
  it('instantiates branded types and environment', () => {
    const raw = asRawText('Test secret');
    const sanitized = brandSanitizedText('Test [CARD_1]');
    expect(raw).toBe('Test secret');
    expect(sanitized).toBe('Test [CARD_1]');
  });
});
