import { describe, it, expect } from 'vitest';
import { runDetectors } from '../src/core/detectors/engine';
import { GLOBAL_PACK } from '../src/core/packs/global';
import { US_PACK } from '../src/core/packs/us';
import { IN_PACK } from '../src/core/packs/in';

const ALL_DETECTORS = [...GLOBAL_PACK, ...US_PACK, ...IN_PACK];

describe('T-1.3 & T-1.4: Deterministic detectors (GLOBAL, US, IN packs)', () => {
  describe('Card Detection (Luhn & Prefix)', () => {
    it('detects valid Visa, Mastercard, Amex, and Discover numbers with high confidence', () => {
      const text =
        'Cards: Visa 4242 4242 4242 4242, MC 5555-5555-5555-4444, Amex 378282246310005, Discover 6011111111111117';
      const spans = runDetectors(text, { detectors: GLOBAL_PACK });

      const cardSpans = spans.filter((s) => s.type === 'CARD_NUMBER');
      expect(cardSpans.length).toBe(4);
      cardSpans.forEach((s) => {
        expect(s.confidence).toBe('high');
        expect(s.reason).toBe('luhn-ok');
      });
      expect(cardSpans[0].originalText).toBe('4242 4242 4242 4242');
      expect(cardSpans[1].originalText).toBe('5555-5555-5555-4444');
      expect(cardSpans[2].originalText).toBe('378282246310005');
      expect(cardSpans[3].originalText).toBe('6011111111111117');
    });

    it('rejects cards with bad Luhn checksum or non-card digit runs', () => {
      const text = 'Invalid card 4242424242424241 and order 1234567890123 shipped';
      const spans = runDetectors(text, { detectors: GLOBAL_PACK });
      const cardSpans = spans.filter((s) => s.type === 'CARD_NUMBER');
      expect(cardSpans.length).toBe(0);
    });
  });

  describe('IBAN Detection (Mod-97)', () => {
    it('detects valid GB, DE, FR IBANs with high confidence', () => {
      const text =
        'Accounts: GB82 WEST 1234 5698 7654 32, DE89370400440532013000, and FR1420041010050500013M02606';
      const spans = runDetectors(text, { detectors: GLOBAL_PACK });
      const ibanSpans = spans.filter((s) => s.type === 'IBAN');

      expect(ibanSpans.length).toBe(3);
      ibanSpans.forEach((s) => {
        expect(s.confidence).toBe('high');
        expect(s.reason).toBe('mod97-ok');
      });
    });

    it('rejects IBAN with bad checksum', () => {
      const text = 'Bad IBAN: GB82WEST12345698765433';
      const spans = runDetectors(text, { detectors: GLOBAL_PACK });
      const ibanSpans = spans.filter((s) => s.type === 'IBAN');
      expect(ibanSpans.length).toBe(0);
    });
  });

  describe('Indian (IN) Pack: Aadhaar, PAN, IFSC, UPI, Phone', () => {
    it('detects valid Aadhaar numbers with Verhoeff checksum and rejects invalid ones', () => {
      const validText = 'Aadhaar: 5510 0365 7624, 5038 0503 4513, 5623 9317 6300';
      const validSpans = runDetectors(validText, { detectors: IN_PACK });
      const aadhaarSpans = validSpans.filter((s) => s.type === 'GOV_ID');
      expect(aadhaarSpans.length).toBe(3);
      aadhaarSpans.forEach((s) => {
        expect(s.confidence).toBe('high');
        expect(s.reason).toBe('in:aadhaar-verhoeff');
      });

      // Corrupted last digit without keyword (doc 09 §12 vector) -> reject
      const badText = 'Corrupted: 551003657625';
      const badSpans = runDetectors(badText, { detectors: IN_PACK });
      const badAadhaar = badSpans.filter((s) => s.type === 'GOV_ID');
      expect(badAadhaar.length).toBe(0);

      // Corrupted last digit WITH keyword -> falls back to medium confidence per §6.3
      const ctxText = 'Aadhaar: 551003657625';
      const ctxSpans = runDetectors(ctxText, { detectors: IN_PACK });
      const ctxAadhaar = ctxSpans.filter((s) => s.type === 'GOV_ID');
      expect(ctxAadhaar.length).toBe(1);
      expect(ctxAadhaar[0].confidence).toBe('medium');
      expect(ctxAadhaar[0].reason).toBe('in:aadhaar-context');
    });

    it('detects PAN cards with correct format and keyword boost', () => {
      const text = 'My PAN is ABCPE1234F. Invalid ones are ABCPE12345 and abcpe1234f.';
      const spans = runDetectors(text, { detectors: IN_PACK });
      const panSpans = spans.filter((s) => s.type === 'TAX_ID');

      expect(panSpans.length).toBe(1);
      expect(panSpans[0].originalText).toBe('ABCPE1234F');
      expect(panSpans[0].confidence).toBe('high'); // boosted by keyword 'PAN'
    });

    it('detects IFSC code', () => {
      const text = 'Bank IFSC: SBIN0001234.';
      const spans = runDetectors(text, { detectors: IN_PACK });
      const ifscSpans = spans.filter((s) => s.type === 'ROUTING_OR_IFSC');

      expect(ifscSpans.length).toBe(1);
      expect(ifscSpans[0].originalText).toBe('SBIN0001234');
      expect(ifscSpans[0].confidence).toBe('high');
    });

    it('detects UPI VPA and distinguishes from standard email', () => {
      const text = 'Pay to test.user@okaxis or email alice.example@example.com';
      const spans = runDetectors(text, { detectors: [...GLOBAL_PACK, ...IN_PACK] });

      const upiSpans = spans.filter((s) => s.type === 'UPI_ID');
      const emailSpans = spans.filter((s) => s.type === 'EMAIL');

      expect(upiSpans.length).toBe(1);
      expect(upiSpans[0].originalText).toBe('test.user@okaxis');

      expect(emailSpans.length).toBe(1);
      expect(emailSpans[0].originalText).toBe('alice.example@example.com');
    });

    it('detects Indian phones with and without +91 and rejects numbers starting with <6', () => {
      const text = 'Call +91-98765-43210 or 98765 43210. Not a phone: 5876543210.';
      const spans = runDetectors(text, { detectors: IN_PACK });
      const phones = spans.filter((s) => s.type === 'PHONE');

      expect(phones.length).toBe(2);
      expect(phones[0].originalText).toBe('+91-98765-43210');
      expect(phones[1].originalText).toBe('98765 43210');
    });
  });

  describe('US Pack: SSN, ABA Routing, Phone', () => {
    it('detects valid US SSN and rejects invalid area/group codes', () => {
      const validText = 'My SSN: 123-45-6789';
      const spans = runDetectors(validText, { detectors: US_PACK });
      const ssnSpans = spans.filter((s) => s.type === 'TAX_ID');

      expect(ssnSpans.length).toBe(1);
      expect(ssnSpans[0].originalText).toBe('123-45-6789');

      // Rejects: 000-, 666-, 9xx-, -00-, -0000
      const invalidText = '000-12-3456 666-12-3456 900-12-3456 123-00-6789 123-45-0000';
      const invalidSpans = runDetectors(invalidText, { detectors: US_PACK });
      expect(invalidSpans.filter((s) => s.type === 'TAX_ID').length).toBe(0);
    });

    it('detects ABA routing with valid checksum and rejects invalid ones', () => {
      const text = 'Routing aba 123456780 and routing aba 021000021, but not routing 123456789';
      const spans = runDetectors(text, { detectors: US_PACK });
      const routingSpans = spans.filter((s) => s.type === 'ROUTING_OR_IFSC');

      expect(routingSpans.length).toBe(2);
      expect(routingSpans[0].originalText).toBe('123456780');
      expect(routingSpans[1].originalText).toBe('021000021');
    });

    it('detects US phone formats', () => {
      const text = 'Phone numbers: (202) 555-0123 and +1 202.555.0111';
      const spans = runDetectors(text, { detectors: US_PACK });
      const phones = spans.filter((s) => s.type === 'PHONE');

      expect(phones.length).toBe(2);
      expect(phones[0].originalText).toBe('(202) 555-0123');
      expect(phones[1].originalText).toBe('+1 202.555.0111');
    });
  });

  describe('Context and API Key Detectors', () => {
    it('detects account number with context and rejects order numbers', () => {
      const text =
        'Account number: 123456789012 was debited. Note: order number 123456789012 shipped.';
      const spans = runDetectors(text, { detectors: GLOBAL_PACK });
      const accts = spans.filter((s) => s.type === 'ACCOUNT_NUMBER');

      expect(accts.length).toBe(1);
      expect(accts[0].originalText).toBe('123456789012');
    });

    it('detects DOB with context and ignores invoice dates', () => {
      const text =
        'DOB: 14/03/1990, born on 1990-03-14, Date of birth 14 March 1990. Invoice date 14/03/2026.';
      const spans = runDetectors(text, { detectors: GLOBAL_PACK });
      const dobs = spans.filter((s) => s.type === 'DOB');

      expect(dobs.length).toBe(3);
      expect(dobs[0].originalText).toBe('14/03/1990');
      expect(dobs[1].originalText).toBe('1990-03-14');
      expect(dobs[2].originalText).toBe('14 March 1990');
    });

    it('detects API keys: AWS, Google, GitHub, OpenAI SK, JWT', () => {
      const awsKey = 'AKIA' + 'J'.repeat(16);
      const googleKey = 'AIza' + 'x'.repeat(35);
      const ghKey = 'ghp_' + 'a'.repeat(36);
      const skKey = 'sk-' + 'b'.repeat(25);
      const jwtKey = 'eyJ' + 'a'.repeat(10) + '.' + 'b'.repeat(10) + '.' + 'c'.repeat(10);

      const text = `Keys: ${awsKey} ${googleKey} ${ghKey} ${skKey} ${jwtKey}`;
      const spans = runDetectors(text, { detectors: GLOBAL_PACK });
      const keys = spans.filter((s) => s.type === 'API_KEY');

      expect(keys.length).toBe(5);
    });

    it('detects custom terms case-insensitively with high confidence', () => {
      const text = 'Discussing AcmeCorp and acmecorp contracts with John Doe.';
      const spans = runDetectors(text, {
        detectors: ALL_DETECTORS,
        customTerms: ['AcmeCorp'],
      });
      const custom = spans.filter((s) => s.type === 'CUSTOM');

      expect(custom.length).toBe(2);
      expect(custom[0].confidence).toBe('high');
      expect(custom[1].confidence).toBe('high');
    });

    it('detects amounts only when strictMode is enabled', () => {
      const text = 'Price is $12,450.75 and Rs. 5,000 or USD 1,200';
      const defaultSpans = runDetectors(text, { detectors: GLOBAL_PACK, strictMode: false });
      expect(defaultSpans.filter((s) => s.type === 'AMOUNT').length).toBe(0);

      const strictSpans = runDetectors(text, { detectors: GLOBAL_PACK, strictMode: true });
      expect(strictSpans.filter((s) => s.type === 'AMOUNT').length).toBe(3);
    });
  });
});
