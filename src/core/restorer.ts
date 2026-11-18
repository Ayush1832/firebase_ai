/**
 * Local Answer Restorer (Exact + Tolerant)
 * Refines docs/09-DETECTOR-SPEC.md §10.
 * Restores vault values locally into answer text. Never fuzzy-guesses.
 */

import { Vault } from './vault';

export interface RestoreResult {
  restoredText: string;
  counts: {
    restored: number;
    unknown: number;
    mangled: number;
  };
}

const EXACT_TOKEN_REGEX = /\[([A-Z]{2,8}_\d{1,4})\]/g;

// Tolerant variations: case, escapes, inner spaces, alternate brackets, backticks
const TOLERANT_PATTERN = /(?:\\?\[|\(|［|\{|\`)\s*([A-Za-z0-9_\\ -]{2,20})\s*(?:\\?\]|\)|］|\}|\`)/g;

function normalizeVariantToCanonicalPlaceholder(variant: string): string | null {
  // Remove markdown backslashes, internal spaces, and uppercase
  const cleaned = variant.replace(/[\\ ]/g, '').toUpperCase();
  const match = /^([A-Z]{2,8})_(\d{1,4})$/.exec(cleaned);
  if (!match) return null;
  return `[${match[1]}_${match[2]}]`;
}

export function restorePlaceholders(
  answer: string,
  vault: Vault
): RestoreResult {
  if (!answer || answer.length === 0) {
    return {
      restoredText: '',
      counts: { restored: 0, unknown: 0, mangled: 0 },
    };
  }

  let restored = 0;
  let unknown = 0;
  let mangled = 0;

  // 1. Exact Pass
  let currentText = answer.replace(EXACT_TOKEN_REGEX, (match, _labelWithNum) => {
    if (vault.isLiteral(match)) {
      // Input already had this token before masking (collision avoidance) -> leave literal
      return match;
    }

    const entry = vault.get(match);
    if (entry && entry.surfaceForms.length > 0) {
      restored++;
      // Return the most recent surface form seen
      return entry.surfaceForms[entry.surfaceForms.length - 1];
    }

    // Token has valid placeholder syntax but is not in the vault
    unknown++;
    return match;
  });

  // 2. Tolerant Pass for model mangled variants
  currentText = currentText.replace(TOLERANT_PATTERN, (fullMatch, inner) => {
    // If it was already an exact uppercase token that was unknown in the vault, skip it
    if (/^\[[A-Z]{2,8}_\d{1,4}\]$/.test(fullMatch)) {
      return fullMatch;
    }

    const canonicalPlaceholder = normalizeVariantToCanonicalPlaceholder(inner);
    if (!canonicalPlaceholder) return fullMatch;

    if (vault.isLiteral(canonicalPlaceholder)) return fullMatch;

    const entry = vault.get(canonicalPlaceholder);
    if (entry && entry.surfaceForms.length > 0) {
      restored++;
      mangled++;
      return entry.surfaceForms[entry.surfaceForms.length - 1];
    }

    return fullMatch;
  });

  return {
    restoredText: currentText,
    counts: { restored, unknown, mangled },
  };
}
