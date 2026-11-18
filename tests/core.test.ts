import { describe, it, expect } from 'vitest';
import { chunkText, deduplicateSpans, shiftSpanToOriginal } from '../src/core/chunker';
import { resolveOverlaps } from '../src/core/merge';
import { Vault } from '../src/core/vault';
import { maskText } from '../src/core/masker';
import { evaluateSafetyGate } from '../src/core/gate';
import { restorePlaceholders } from '../src/core/restorer';
import { decideAnswerRoute, DEFAULT_POLICY_CONFIG } from '../src/core/policy';
import { GLOBAL_PACK } from '../src/core/packs/global';
import { Span, brandSanitizedText, ConsentState } from '../src/shared/types';

describe('Phase 1 Core Engine Integration (T-1.5 to T-1.10)', () => {
  describe('T-1.5 Chunker', () => {
    it('splits text at natural boundaries with overlap and preserves offsets', () => {
      const paragraph1 = 'A'.repeat(800) + '.\n\n';
      const paragraph2 = 'B'.repeat(800) + '.\n\n';
      const paragraph3 = 'C'.repeat(500);
      const fullText = paragraph1 + paragraph2 + paragraph3;

      const chunks = chunkText(fullText, { chunkChars: 1000, overlapChars: 100 });
      expect(chunks.length).toBeGreaterThan(1);

      // Verify each chunk points to exact slice in original text
      for (const chunk of chunks) {
        expect(fullText.slice(chunk.startInOriginal, chunk.endInOriginal)).toBe(chunk.text);
      }

      // Span offset shifting test
      const testSpan: Span = {
        type: 'PERSON',
        start: 10,
        end: 25,
        source: 'nano',
        confidence: 'medium',
        reason: 'nano',
      };
      const shifted = shiftSpanToOriginal(testSpan, chunks[1]);
      expect(shifted.start).toBe(testSpan.start + chunks[1].startInOriginal);
      expect(shifted.end).toBe(testSpan.end + chunks[1].startInOriginal);
    });

    it('deduplicates identical spans across overlapping chunks', () => {
      const spans: Span[] = [
        { type: 'PERSON', start: 50, end: 60, source: 'nano', confidence: 'medium', reason: 'r1' },
        { type: 'PERSON', start: 50, end: 60, source: 'nano', confidence: 'medium', reason: 'r2' },
        { type: 'ORG', start: 50, end: 60, source: 'nano', confidence: 'medium', reason: 'r3' },
      ];
      const deduped = deduplicateSpans(spans);
      expect(deduped.length).toBe(2);
    });
  });

  describe('T-1.6 Merge & Overlap Resolution', () => {
    it('high-confidence inner span splits a lower-confidence wrapper span', () => {
      // e.g. email (high) inside person name from Nano (medium)
      const spans: Span[] = [
        {
          type: 'PERSON',
          start: 0,
          end: 30,
          source: 'nano',
          confidence: 'medium',
          reason: 'nano-person',
        },
        {
          type: 'EMAIL',
          start: 10,
          end: 25,
          source: 'rule',
          confidence: 'high',
          reason: 'rule-email',
        },
      ];

      const resolved = resolveOverlaps(spans);
      expect(resolved.length).toBe(3);

      expect(resolved[0].start).toBe(0);
      expect(resolved[0].end).toBe(10);
      expect(resolved[0].type).toBe('PERSON');

      expect(resolved[1].start).toBe(10);
      expect(resolved[1].end).toBe(25);
      expect(resolved[1].type).toBe('EMAIL');
      expect(resolved[1].confidence).toBe('high');

      expect(resolved[2].start).toBe(25);
      expect(resolved[2].end).toBe(30);
      expect(resolved[2].type).toBe('PERSON');
    });

    it('preserves union of reasons on identical span ranges', () => {
      const spans: Span[] = [
        { type: 'CARD_NUMBER', start: 5, end: 24, source: 'rule', confidence: 'high', reason: 'luhn-ok' },
        { type: 'CARD_NUMBER', start: 5, end: 24, source: 'nano', confidence: 'medium', reason: 'nano-card' },
      ];
      const resolved = resolveOverlaps(spans);
      expect(resolved.length).toBe(1);
      expect(resolved[0].confidence).toBe('high');
      expect(resolved[0].reason).toContain('luhn-ok');
      expect(resolved[0].reason).toContain('nano-card');
    });

    it('requires confirmation before un-masking a high-confidence span', () => {
      const span: Span = {
        type: 'CARD_NUMBER',
        start: 0,
        end: 16,
        source: 'rule',
        confidence: 'high',
        reason: 'luhn-ok',
      };

      // Unconfirmed exclusion -> span stays
      const kept = resolveOverlaps([span], [{ start: 0, end: 16, type: 'CARD_NUMBER', confirmedHigh: false }]);
      expect(kept.length).toBe(1);

      // Confirmed exclusion -> span removed
      const removed = resolveOverlaps([span], [{ start: 0, end: 16, type: 'CARD_NUMBER', confirmedHigh: true }]);
      expect(removed.length).toBe(0);
    });
  });

  describe('T-1.7 Masker & Vault', () => {
    it('canonicalizes values and allocates stable placeholders per value', () => {
      const vault = new Vault();
      const raw = 'Card: 4242 4242 4242 4242. Again: 4242-4242-4242-4242.';

      const spans: Span[] = [
        { type: 'CARD_NUMBER', start: 6, end: 25, source: 'rule', confidence: 'high', reason: 'luhn' },
        { type: 'CARD_NUMBER', start: 34, end: 53, source: 'rule', confidence: 'high', reason: 'luhn' },
      ];

      const res = maskText(raw, spans, vault);
      expect(res.sanitized).toBe('Card: [CARD_1]. Again: [CARD_1].');
      expect(vault.getAllEntries().length).toBe(1);
      expect(vault.get('[CARD_1]')?.surfaceForms).toContain('4242 4242 4242 4242');
      expect(vault.get('[CARD_1]')?.surfaceForms).toContain('4242-4242-4242-4242');
    });

    it('avoids collision with pre-existing placeholder tokens in user text (T-11)', () => {
      const vault = new Vault();
      // Input already contains a literal [CARD_1]
      const raw = 'I am discussing [CARD_1] and my real card is 4242 4242 4242 4242.';
      const spans: Span[] = [
        { type: 'CARD_NUMBER', start: 45, end: 64, source: 'rule', confidence: 'high', reason: 'luhn' },
      ];

      const res = maskText(raw, spans, vault);
      // New card should receive [CARD_2], preserving literal [CARD_1]
      expect(res.sanitized).toBe('I am discussing [CARD_1] and my real card is [CARD_2].');
      expect(vault.isLiteral('[CARD_1]')).toBe(true);
      expect(vault.isLiteral('[CARD_2]')).toBe(false);
    });
  });

  describe('T-1.8 Safety Gate', () => {
    it('blocks when high confidence sensitive values remain in sanitized text', () => {
      const vault = new Vault();
      // Leaked card number not masked
      const leakyText = 'Here is your card 4242 4242 4242 4242 and [CARD_1]';
      const gateResult = evaluateSafetyGate(leakyText, { detectors: GLOBAL_PACK, vault });

      expect(gateResult.status).toBe('blocked');
      if (gateResult.status === 'blocked') {
        expect(gateResult.leftovers.length).toBeGreaterThan(0);
        expect(gateResult.leftovers[0].type).toBe('CARD_NUMBER');
      }
    });

    it('blocks if a vault surface form (length >= 4) appears verbatim in sanitized text', () => {
      const vault = new Vault();
      vault.getOrCreatePlaceholder('PERSON', 'Alexander Hamilton');

      // Sanitized text contains 'Alexander Hamilton'
      const leakyText = 'Hello Alexander Hamilton, your account is [ACCT_1]';
      const gateResult = evaluateSafetyGate(leakyText, { detectors: GLOBAL_PACK, vault });

      expect(gateResult.status).toBe('blocked');
      if (gateResult.status === 'blocked') {
        expect(gateResult.leftovers[0].type).toBe('PERSON');
      }
    });

    it('passes when sanitized text is clean and produces branded SanitizedText', () => {
      const vault = new Vault();
      vault.getOrCreatePlaceholder('PERSON', 'Alexander Hamilton');

      const cleanText = 'Hello [PERSON_1], your balance is clean.';
      const gateResult = evaluateSafetyGate(cleanText, { detectors: GLOBAL_PACK, vault });

      expect(gateResult.status).toBe('passed');
      if (gateResult.status === 'passed') {
        expect(gateResult.text).toBe(cleanText);
        expect(gateResult.remainingMedium).toBe(0);
      }
    });
  });

  describe('T-1.9 Restorer', () => {
    it('restores exact placeholders using vault surface forms', () => {
      const vault = new Vault();
      vault.getOrCreatePlaceholder('PERSON', 'Alice Walker');
      vault.getOrCreatePlaceholder('CARD_NUMBER', '4242 4242 4242 4242');

      const modelAnswer = 'Hello [PERSON_1], your card [CARD_1] was debited.';
      const restored = restorePlaceholders(modelAnswer, vault);

      expect(restored.restoredText).toBe('Hello Alice Walker, your card 4242 4242 4242 4242 was debited.');
      expect(restored.counts.restored).toBe(2);
      expect(restored.counts.unknown).toBe(0);
      expect(restored.counts.mangled).toBe(0);
    });

    it('tolerantly restores mangled placeholders (escapes, case, inner spaces, backticks)', () => {
      const vault = new Vault();
      vault.getOrCreatePlaceholder('PERSON', 'Alice Walker');

      const mangledAnswer =
        'Variations: [person_1], [ PERSON_1 ], \\[PERSON\\_1\\], `PERSON_1`, and {PERSON_1}.';
      const restored = restorePlaceholders(mangledAnswer, vault);

      expect(restored.restoredText).toContain('Alice Walker');
      expect(restored.counts.restored).toBe(5);
      expect(restored.counts.mangled).toBe(5);
    });

    it('preserves literal tokens and counts unknown placeholders', () => {
      const vault = new Vault();
      vault.registerExistingTokens('Pre-existing literal [CARD_1]');

      const answer = 'Literal [CARD_1] and unknown [ORG_99].';
      const restored = restorePlaceholders(answer, vault);

      expect(restored.restoredText).toBe('Literal [CARD_1] and unknown [ORG_99].');
      expect(restored.counts.unknown).toBe(1);
      expect(restored.counts.restored).toBe(0);
    });
  });

  describe('T-1.10 Policy & Invariant I-6 Routing', () => {
    const validConsent: ConsentState = {
      cloudAllowed: true,
      over18: true,
      regionOk: true,
      version: 1,
      at: Date.now(),
    };

    it('Invariant I-6: Routes ON_DEVICE whenever cloud consent is absent or incomplete', () => {
      const sanitized = brandSanitizedText('Short question');

      // No consent
      expect(
        decideAnswerRoute({
          sanitizedText: sanitized,
          consent: null,
          availability: 'ready',
          isOnline: true,
          config: DEFAULT_POLICY_CONFIG,
        }).route
      ).toBe('ON_DEVICE');

      // Consent not acknowledged over 18
      expect(
        decideAnswerRoute({
          sanitizedText: sanitized,
          consent: { ...validConsent, over18: false },
          availability: 'ready',
          isOnline: true,
          config: DEFAULT_POLICY_CONFIG,
        }).route
      ).toBe('ON_DEVICE');

      // Consent out of date version
      expect(
        decideAnswerRoute({
          sanitizedText: sanitized,
          consent: { ...validConsent, version: 0 },
          availability: 'ready',
          isOnline: true,
          config: DEFAULT_POLICY_CONFIG,
        }).route
      ).toBe('ON_DEVICE');
    });

    it('routes ON_DEVICE if offline or kill switch is active regardless of other flags', () => {
      const sanitized = brandSanitizedText('Analyze my large spreadsheet');

      // Offline
      expect(
        decideAnswerRoute({
          sanitizedText: sanitized,
          consent: validConsent,
          availability: 'ready',
          isOnline: false,
          config: DEFAULT_POLICY_CONFIG,
        }).route
      ).toBe('ON_DEVICE');

      // Remote kill switch active
      expect(
        decideAnswerRoute({
          sanitizedText: sanitized,
          consent: validConsent,
          availability: 'ready',
          isOnline: true,
          config: { ...DEFAULT_POLICY_CONFIG, cloudKillSwitch: true },
        }).route
      ).toBe('ON_DEVICE');
    });

    it('routes IN_CLOUD for heavy tasks or when input exceeds token budget when consented', () => {
      const heavySanitized = brandSanitizedText('Please analyze and compare all transactions in this statement.');
      const decision = decideAnswerRoute({
        sanitizedText: heavySanitized,
        consent: validConsent,
        availability: 'ready',
        isOnline: true,
        config: DEFAULT_POLICY_CONFIG,
      });

      expect(decision.route).toBe('IN_CLOUD');
      expect(decision.reason).toContain('Heavy task detected');
      expect(decision.modelName).toBe(DEFAULT_POLICY_CONFIG.cloudModel);
    });

    it('routes IN_CLOUD if on-device model is unavailable and user has consented', () => {
      const sanitized = brandSanitizedText('Simple prompt');
      const decision = decideAnswerRoute({
        sanitizedText: sanitized,
        consent: validConsent,
        availability: 'downloading',
        isOnline: true,
        config: DEFAULT_POLICY_CONFIG,
      });

      expect(decision.route).toBe('IN_CLOUD');
      expect(decision.reason).toContain('On-device AI not ready');
    });
  });
});
