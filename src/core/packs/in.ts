/**
 * India (IN) Detector Pack
 * Refines docs/09-DETECTOR-SPEC.md §6.3.
 */

import { Detector } from '../detectors/types';
import { validateVerhoeff } from '../detectors/validators';

export const IN_PACK: Detector[] = [
  // 1. Permanent Account Number (PAN)
  {
    id: 'in-pan',
    type: 'TAX_ID',
    pack: 'IN',
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    reason: 'in:pan',
    validate: (candidate, ctx, match) => {
      // 4th letter is the holder type
      const holderType = candidate[3];
      const validHolders = new Set(['A', 'B', 'C', 'F', 'G', 'H', 'L', 'J', 'P', 'T']);
      if (!validHolders.has(holderType)) {
        return { match: false };
      }

      const windowStart = Math.max(0, match.index - 20);
      const windowEnd = Math.min(ctx.normalized.length, match.index + candidate.length + 20);
      const nearby = ctx.normalized.slice(windowStart, windowEnd).toLowerCase();
      const hasKeyword = /\bpan\b/.test(nearby);

      return {
        match: true,
        confidence: hasKeyword ? 'high' : 'medium',
        reason: 'in:pan',
      };
    },
  },

  // 2. Aadhaar (12 digits with Verhoeff checksum)
  {
    id: 'in-aadhaar',
    type: 'GOV_ID',
    pack: 'IN',
    pattern: /(?<!\d)[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?!\d)/g,
    reason: 'in:aadhaar-verhoeff',
    validate: (candidate, ctx, match) => {
      const clean = candidate.replace(/[\s-]/g, '');
      if (clean.length !== 12) return { match: false };

      const isVerhoeffValid = validateVerhoeff(clean);
      if (isVerhoeffValid) {
        return { match: true, confidence: 'high', reason: 'in:aadhaar-verhoeff' };
      }

      // Check if keyword 'aadhaar' or 'uid' is nearby
      const windowStart = Math.max(0, match.index - 25);
      const windowEnd = Math.min(ctx.normalized.length, match.index + candidate.length + 25);
      const nearby = ctx.normalized.slice(windowStart, windowEnd).toLowerCase();
      if (/\b(aadhaar|uid|aadhar)\b/.test(nearby)) {
        return { match: true, confidence: 'medium', reason: 'in:aadhaar-context' };
      }

      return { match: false };
    },
  },

  // 3. IFSC (Indian Financial System Code)
  {
    id: 'in-ifsc',
    type: 'ROUTING_OR_IFSC',
    pack: 'IN',
    pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    reason: 'in:ifsc',
    validate: (candidate, ctx, match) => {
      const windowStart = Math.max(0, match.index - 20);
      const windowEnd = Math.min(ctx.normalized.length, match.index + candidate.length + 20);
      const nearby = ctx.normalized.slice(windowStart, windowEnd).toLowerCase();
      const hasKeyword = /\bifsc\b/.test(nearby);

      return {
        match: true,
        confidence: hasKeyword ? 'high' : 'medium',
        reason: 'in:ifsc',
      };
    },
  },

  // 4. UPI ID (Virtual Payment Address)
  {
    id: 'in-upi',
    type: 'UPI_ID',
    pack: 'IN',
    // Negative lookahead prevents matching regular email addresses
    pattern: /\b[A-Za-z0-9._-]{2,64}@[A-Za-z]{2,32}\b(?!\.[A-Za-z])/g,
    reason: 'in:upi',
    validate: (candidate, ctx, match) => {
      const windowStart = Math.max(0, match.index - 20);
      const windowEnd = Math.min(ctx.normalized.length, match.index + candidate.length + 20);
      const nearby = ctx.normalized.slice(windowStart, windowEnd).toLowerCase();
      const hasKeyword = /\b(upi|vpa)\b/.test(nearby);

      return {
        match: true,
        confidence: hasKeyword ? 'high' : 'medium',
        reason: 'in:upi',
      };
    },
  },

  // 5. Indian Phone Numbers
  {
    id: 'in-phone',
    type: 'PHONE',
    pack: 'IN',
    pattern: /(?<![\d])(?:(?:\+|00)?91[ -]?)?[6-9]\d{4}[ -]?\d{5}(?![\d])/g,
    reason: 'in:phone',
    validate: (candidate, ctx, match) => {
      const isWithCountryCode = /(?:\+|00)?91/.test(candidate);
      const windowStart = Math.max(0, match.index - 20);
      const windowEnd = Math.min(ctx.normalized.length, match.index + candidate.length + 20);
      const nearby = ctx.normalized.slice(windowStart, windowEnd).toLowerCase();
      const hasKeyword = /\b(phone|mobile|call|tel)\b/.test(nearby);

      if (isWithCountryCode || hasKeyword) {
        return { match: true, confidence: 'medium', reason: 'in:phone' };
      }
      return { match: true, confidence: 'low', reason: 'in:phone-bare' };
    },
  },
];
