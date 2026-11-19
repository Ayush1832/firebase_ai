import { describe, it, expect } from 'vitest';
import { evaluateRules } from '../scripts/eval-rules';

describe('T-1.12: Rules Layer Evaluation Harness', () => {
  it('achieves ~100% recall on structured identifiers across dev split', () => {
    const report = evaluateRules('dev');

    // Structured identifiers must be ~100% recall per doc 06 §6
    expect(report.structuredRecall).toBeGreaterThanOrEqual(95);

    // Specific structured checks
    expect(report.byType.CARD_NUMBER?.recall).toBe(100);
    expect(report.byType.IBAN?.recall).toBe(100);
    expect(report.byType.TAX_ID?.recall).toBe(100);
    expect(report.byType.GOV_ID?.recall).toBe(100);
    expect(report.byType.UPI_ID?.recall).toBe(100);

    // Free-text types (PERSON, ADDRESS) have expected low recall in rules-only mode
    // (This is documented and intended: Nano handles names/addresses)
    expect(report.byType.PERSON?.recall).toBeLessThan(50);
  });

  it('runs on held-out split without breaking baseline invariants', () => {
    const report = evaluateRules('held-out');
    console.log('Held-out structured recall:', report.structuredRecall, '% | overall precision:', report.overallPrecision, '%');
    expect(report.structuredRecall).toBeGreaterThanOrEqual(95);
  });
});
