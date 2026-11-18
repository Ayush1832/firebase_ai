/**
 * Deterministic Checksum & Algorithm Validators
 * Luhn (Cards), Mod-97 (IBAN), Verhoeff (Aadhaar), ABA (US Routing).
 * Refines docs/09-DETECTOR-SPEC.md §5 & §12.
 */

/**
 * Luhn algorithm for credit / debit card verification.
 */
export function validateLuhn(cardNumber: string): boolean {
  const clean = cardNumber.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(clean)) return false;

  let sum = 0;
  let alternate = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean[i], 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/**
 * Plausible card issuer prefix check (Visa: 4, MC: 5 or 2, Amex: 3, Discover: 6)
 */
export function isPlausibleCardPrefix(cardNumber: string): boolean {
  const clean = cardNumber.replace(/[\s-]/g, '');
  const first = clean[0];
  return first === '3' || first === '4' || first === '5' || first === '6';
}

/**
 * ISO 7064 Mod 97-10 check for IBAN.
 * Expects country code + 2 check digits + up to 30 alphanumeric characters.
 * mod-97 remainder must equal 1.
 */
export function validateIBAN(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) return false;

  // Move first 4 characters (country code and check digits) to the end
  const rearranged = clean.slice(4) + clean.slice(0, 4);

  // Convert letters to numbers (A=10, B=11 ... Z=35)
  let numeric = '';
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      numeric += (code - 55).toString();
    } else {
      numeric += rearranged[i];
    }
  }

  // Piecewise mod 97 to avoid BigInt overflow or scientific notation
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const block = remainder.toString() + numeric.slice(i, i + 7);
    remainder = parseInt(block, 10) % 97;
  }

  return remainder === 1;
}

/**
 * Verhoeff algorithm for Indian Aadhaar verification.
 * Standard d (multiplication), p (permutation), and inv (inverse) tables.
 */
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function validateVerhoeff(numStr: string): boolean {
  const clean = numStr.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(clean)) return false;

  let c = 0;
  const digits = clean.split('').map(Number).reverse();

  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }

  return c === 0;
}

/**
 * ABA Routing Transit Number checksum:
 * 3*(d1 + d4 + d7) + 7*(d2 + d5 + d8) + (d3 + d6 + d9) mod 10 === 0
 */
export function validateABARouting(routingStr: string): boolean {
  const clean = routingStr.replace(/\s/g, '');
  if (!/^\d{9}$/.test(clean)) return false;

  const d = clean.split('').map(Number);
  const checksum =
    3 * (d[0] + d[3] + d[6]) +
    7 * (d[1] + d[4] + d[7]) +
    (d[2] + d[5] + d[8]);

  return checksum % 10 === 0;
}
