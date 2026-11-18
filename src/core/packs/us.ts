/**
 * US Detector Pack
 * Refines docs/09-DETECTOR-SPEC.md §6.2.
 */

import { Detector } from '../detectors/types';
import { validateABARouting } from '../detectors/validators';

export const US_PACK: Detector[] = [
  // 1. Social Security Number (SSN)
  {
    id: 'us-ssn',
    type: 'TAX_ID',
    pack: 'US',
    // Shape: rejects 000-, 666-, 9xx-, -00-, -0000
    pattern: /(?<!\d)(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}(?!\d)/g,
    reason: 'us:ssn',
    validate: (candidate, ctx, match) => {
      const windowStart = Math.max(0, match.index - 25);
      const windowEnd = Math.min(ctx.normalized.length, match.index + candidate.length + 25);
      const nearby = ctx.normalized.slice(windowStart, windowEnd).toLowerCase();
      const hasKeyword = /\b(ssn|social security)\b/.test(nearby);

      return {
        match: true,
        confidence: hasKeyword ? 'high' : 'medium',
        reason: 'us:ssn',
      };
    },
  },

  // 2. ABA Routing Transit Number (with checksum)
  {
    id: 'us-routing',
    type: 'ROUTING_OR_IFSC',
    pack: 'US',
    pattern: /(?:routing|aba|rtn)[^\n\d]{0,15}(\d{9})(?!\d)/gi,
    captureGroup: 1,
    reason: 'us:routing-aba',
    validate: (candidate) => {
      if (validateABARouting(candidate)) {
        return { match: true, confidence: 'high', reason: 'us:routing-aba' };
      }
      return { match: false };
    },
  },

  // 3. US Phone Numbers
  {
    id: 'us-phone',
    type: 'PHONE',
    pack: 'US',
    pattern: /(?<![\d])(?:\+?1[ .-]?)?\(?[2-9]\d{2}\)?[ .-]\d{3}[ .-]\d{4}(?![\d])/g,
    reason: 'us:phone',
    defaultConfidence: 'medium',
  },

  // 4. ITIN (Individual Taxpayer Identification Number)
  {
    id: 'us-itin',
    type: 'TAX_ID',
    pack: 'US',
    pattern: /(?<!\d)9\d{2}-[7-9]\d-\d{4}(?!\d)/g,
    reason: 'us:itin',
    defaultConfidence: 'medium',
  },
];
