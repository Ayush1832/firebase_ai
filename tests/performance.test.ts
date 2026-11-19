import { describe, it, expect } from 'vitest';
import { runDetectors } from '../src/core/detectors/engine';
import { GLOBAL_PACK } from '../src/core/packs/global';
import { US_PACK } from '../src/core/packs/us';
import { IN_PACK } from '../src/core/packs/in';
import { evaluateSafetyGate } from '../src/core/gate';
import { Vault } from '../src/core/vault';

const ALL_DETECTORS = [...GLOBAL_PACK, ...US_PACK, ...IN_PACK];

describe('T-1.13: Performance & Adversarial Robustness', () => {
  it('rules over 10,000 characters execute under 50 ms budget', () => {
    // 10,000 characters of realistic text with scattered identifiers
    const paragraph =
      'The quarterly financial statement for Priya Sharma (phone: +91-98765-43210) was submitted. ' +
      'Card 4242 4242 4242 4242 was charged $120.50 with account number: 123456789012. ' +
      'Send email inquiries to billing.help@example.com.\n\n';
    const text10k = paragraph.repeat(40); // ~10.4k chars

    const start = performance.now();
    const spans = runDetectors(text10k, { detectors: ALL_DETECTORS });
    const duration = performance.now() - start;

    expect(spans.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100); // 50ms target + margin for CI
  });

  it('rules over 100,000 characters execute under 500 ms budget', () => {
    const paragraph =
      'General ledger update with wire to IBAN: DE89370400440532013000 and contact test.user@okaxis. ' +
      'Payment was acknowledged by customer care representative.\n';
    const text100k = paragraph.repeat(500); // ~100k chars

    const start = performance.now();
    const spans = runDetectors(text100k, { detectors: ALL_DETECTORS });
    const duration = performance.now() - start;

    expect(spans.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // 500ms target + margin for CI
  });

  it('safety gate over 10,000 characters executes under 50 ms budget', () => {
    const vault = new Vault();
    vault.getOrCreatePlaceholder('PERSON', 'Alexander Hamilton');

    const clean10k = 'Hello [PERSON_1], balance verified. '.repeat(300);

    const start = performance.now();
    const gateResult = evaluateSafetyGate(clean10k, { detectors: ALL_DETECTORS, vault });
    const duration = performance.now() - start;

    expect(gateResult.status).toBe('passed');
    expect(duration).toBeLessThan(100);
  });

  it('adversarial 1 MB string against every detector completes within 2 s (linear-time guard)', () => {
    // Adversarial patterns designed to stress backtracking if any nested quantifiers existed:
    // Repeated near-matches
    const mbRepeatedA = 'A'.repeat(1_000_000);
    const mbRepeatedDigits = '4242-'.repeat(200_000);
    const mbRepeatedAt = 'a@'.repeat(500_000);

    for (const detector of ALL_DETECTORS) {
      const start = performance.now();

      // Test against long repeating strings
      const r1 = new RegExp(detector.pattern.source, detector.pattern.flags);
      r1.test(mbRepeatedA);

      const r2 = new RegExp(detector.pattern.source, detector.pattern.flags);
      r2.test(mbRepeatedDigits);

      const r3 = new RegExp(detector.pattern.source, detector.pattern.flags);
      r3.test(mbRepeatedAt);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000); // Under 2s budget per detector
    }
  });
});
