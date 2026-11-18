/**
 * GLOBAL Detector Pack
 * Refines docs/09-DETECTOR-SPEC.md §6.1.
 */

import { Detector } from '../detectors/types';
import { validateLuhn, isPlausibleCardPrefix, validateIBAN } from '../detectors/validators';

export const GLOBAL_PACK: Detector[] = [
  // 1. Email Address
  {
    id: 'email',
    type: 'EMAIL',
    pack: 'GLOBAL',
    pattern: /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}\b/g,
    reason: 'email-shape',
    defaultConfidence: 'high',
  },

  // 2. Payment Cards (Visa, Mastercard, Amex, Discover, etc. with Luhn validation)
  {
    id: 'card',
    type: 'CARD_NUMBER',
    pack: 'GLOBAL',
    pattern: /(?<![\d])(?:\d[ -]?){12,18}\d(?![\d])/g,
    reason: 'luhn-ok',
    validate: (candidate) => {
      const clean = candidate.replace(/[\s-]/g, '');
      if (clean.length < 13 || clean.length > 19) return { match: false };
      if (!isPlausibleCardPrefix(clean)) return { match: false };
      if (!validateLuhn(clean)) return { match: false };
      return { match: true, confidence: 'high', reason: 'luhn-ok' };
    },
  },

  // 3. International Bank Account Number (IBAN with mod-97 validation)
  {
    id: 'iban',
    type: 'IBAN',
    pack: 'GLOBAL',
    pattern: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,3})?\b/g,
    reason: 'mod97-ok',
    validate: (candidate) => {
      if (validateIBAN(candidate)) {
        return { match: true, confidence: 'high', reason: 'mod97-ok' };
      }
      return { match: false };
    },
  },

  // 4. E.164 International Phone Numbers
  {
    id: 'phone-e164',
    type: 'PHONE',
    pack: 'GLOBAL',
    pattern: /(?<![\w+])\+\d{1,3}[ .-]?(?:\(?\d{1,4}\)?[ .-]?){2,5}\d{2,4}(?!\d)/g,
    reason: 'phone-e164',
    validate: (candidate, ctx, match) => {
      const digits = candidate.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) return { match: false };

      // Check context window for phone keywords
      const windowStart = Math.max(0, match.index - 30);
      const windowEnd = Math.min(ctx.normalized.length, match.index + candidate.length + 30);
      const nearby = ctx.normalized.slice(windowStart, windowEnd).toLowerCase();
      const hasKeyword = /\b(phone|mobile|call|tel|cell|fax)\b/.test(nearby);

      return {
        match: true,
        confidence: hasKeyword ? 'high' : 'medium',
        reason: 'phone-e164',
      };
    },
  },

  // 5. Account Number with Context
  {
    id: 'account-ctx',
    type: 'ACCOUNT_NUMBER',
    pack: 'GLOBAL',
    pattern: /(?:account|acct|a\/c|acc\.?\s?(?:no|number)|iban|routing|savings|checking)[^\n\d]{0,30}(\d(?:[ -]?\d){7,16})(?!\d)/gi,
    captureGroup: 1,
    reason: 'context:account',
    validate: (candidate) => {
      const digits = candidate.replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 17) return { match: false };
      return { match: true, confidence: 'medium', reason: 'context:account' };
    },
  },

  // 6. Transaction Reference with Context
  {
    id: 'txn-ctx',
    type: 'TXN_ID',
    pack: 'GLOBAL',
    pattern: /\b(?:txn|transaction|utr|ref(?:erence)?|order)[^\n\w]{0,15}([A-Za-z0-9_-]{8,24})\b/gi,
    captureGroup: 1,
    reason: 'context:txn',
    validate: (_candidate, ctx) => {
      if (!ctx.strictMode) return { match: false };
      return { match: true, confidence: 'low', reason: 'context:txn' };
    },
  },

  // 7. Date of Birth with Context
  {
    id: 'dob-ctx',
    type: 'DOB',
    pack: 'GLOBAL',
    pattern: /(?:dob|d\.o\.b\.?|date of birth|born(?: on)?)[^\n\d]{0,12}(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4})/gi,
    captureGroup: 1,
    reason: 'context:dob',
    defaultConfidence: 'medium',
  },

  // 8. Bearer Tokens
  {
    id: 'bearer',
    type: 'CREDENTIAL',
    pack: 'GLOBAL',
    pattern: /\bBearer\s+[A-Za-z0-9._~+\/-]{20,}=*/g,
    reason: 'bearer-token',
    defaultConfidence: 'high',
  },

  // 9. Passwords, PINs, OTPs, CVVs with Context
  {
    id: 'password-ctx',
    type: 'CREDENTIAL',
    pack: 'GLOBAL',
    pattern: /\b(password|passwd|pwd|pin|otp|cvv|cvc)\s*(?:is|:|=)?\s*(\S{3,64})/gi,
    captureGroup: 2,
    reason: 'context:secret',
    validate: (candidate, _ctx, match) => {
      const keyword = (match[1] || '').toLowerCase();
      const isShortSecret = ['pin', 'otp', 'cvv', 'cvc'].includes(keyword);
      const isDigitsOnly = /^\d{3,8}$/.test(candidate);

      const confidence = isShortSecret && isDigitsOnly ? 'high' : 'medium';
      return { match: true, confidence, reason: 'context:secret' };
    },
  },

  // 10. PEM Private Key Blocks
  {
    id: 'pem',
    type: 'CREDENTIAL',
    pack: 'GLOBAL',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    reason: 'private-key-block',
    defaultConfidence: 'high',
  },

  // 11. API Keys
  {
    id: 'aws-key',
    type: 'API_KEY',
    pack: 'GLOBAL',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    reason: 'key:aws',
    defaultConfidence: 'high',
  },
  {
    id: 'google-key',
    type: 'API_KEY',
    pack: 'GLOBAL',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    reason: 'key:google',
    defaultConfidence: 'high',
  },
  {
    id: 'github-token',
    type: 'API_KEY',
    pack: 'GLOBAL',
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
    reason: 'key:github',
    defaultConfidence: 'high',
  },
  {
    id: 'sk-key',
    type: 'API_KEY',
    pack: 'GLOBAL',
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
    reason: 'key:sk',
    defaultConfidence: 'high',
  },
  {
    id: 'jwt',
    type: 'API_KEY',
    pack: 'GLOBAL',
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    reason: 'key:jwt',
    defaultConfidence: 'high',
  },

  // 12. Amount (Strict Mode Only, ADR-007)
  {
    id: 'amount',
    type: 'AMOUNT',
    pack: 'GLOBAL',
    pattern: /(?:[$€£₹]\s?\d[\d,]*(?:\.\d{1,2})?|\b(?:USD|EUR|GBP|INR|Rs\.?)\s?\d[\d,]*(?:\.\d{1,2})?)/g,
    reason: 'amount',
    validate: (_candidate, ctx) => {
      if (!ctx.strictMode) return { match: false };
      return { match: true, confidence: 'medium', reason: 'amount' };
    },
  },
];
