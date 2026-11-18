import { describe, it, expect } from 'vitest';
import {
  SanitizedText,
  brandSanitizedText,
  asRawText,
  RawText,
  ENTITY_PLACEHOLDER_LABELS,
} from '../src/shared/types';

// Mock function representing the answer model interface
function mockAnswer(sanitized: SanitizedText): string {
  return `Answer for: ${sanitized}`;
}

// Mock function representing the on-device redactor interface
function mockRedact(raw: RawText): string {
  return `Redacting: ${raw}`;
}

describe('T-1.1: Branded types and structural guarantees', () => {
  it('accepts correctly branded SanitizedText', () => {
    const safeText = brandSanitizedText('Sanitized input with [CARD_1]');
    const response = mockAnswer(safeText);
    expect(response).toBe('Answer for: Sanitized input with [CARD_1]');
  });

  it('accepts correctly branded RawText for redactor', () => {
    const raw = asRawText('My card is 4242 4242 4242 4242');
    const response = mockRedact(raw);
    expect(response).toBe('Redacting: My card is 4242 4242 4242 4242');
  });

  it('rejects unbranded plain strings at compile-time', () => {
    const unbrandedString = 'Unsanitized raw string';

    // @ts-expect-error mockAnswer must reject plain strings (only accepts SanitizedText)
    mockAnswer(unbrandedString);

    // @ts-expect-error mockRedact must reject plain strings (only accepts RawText)
    mockRedact(unbrandedString);
  });

  it('provides complete placeholder label mappings for all entity types', () => {
    expect(ENTITY_PLACEHOLDER_LABELS.CARD_NUMBER).toBe('CARD');
    expect(ENTITY_PLACEHOLDER_LABELS.ACCOUNT_NUMBER).toBe('ACCT');
    expect(ENTITY_PLACEHOLDER_LABELS.PERSON).toBe('PERSON');
    expect(ENTITY_PLACEHOLDER_LABELS.EMAIL).toBe('EMAIL');
    expect(ENTITY_PLACEHOLDER_LABELS.PHONE).toBe('PHONE');
    expect(ENTITY_PLACEHOLDER_LABELS.TAX_ID).toBe('TAXID');
    expect(ENTITY_PLACEHOLDER_LABELS.GOV_ID).toBe('GOVID');
  });
});
