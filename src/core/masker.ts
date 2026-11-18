/**
 * Right-to-Left Text Masker
 * Refines docs/09-DETECTOR-SPEC.md §8 & §9.
 * Replaces resolved spans right-to-left with stable placeholders from the Vault.
 */

import { MaskResult, Span, VaultEntry } from '../shared/types';
import { Vault } from './vault';

export function maskText(
  originalText: string,
  resolvedSpans: Span[],
  vault: Vault,
  mode: 'full' | 'rules-only' = 'full',
  degradedChunks: number[] = []
): MaskResult {
  if (!originalText || originalText.length === 0) {
    return {
      sanitized: '',
      spans: [],
      vaultDelta: [],
      mode,
      degradedChunks,
    };
  }

  // 1. Register any literal tokens already in user input to prevent collisions (T-11)
  vault.registerExistingTokens(originalText);

  // 2. Sort spans descending by start index to mask right-to-left
  const sortedSpans = [...resolvedSpans].sort((a, b) => b.start - a.start);
  const vaultDelta: VaultEntry[] = [];

  let sanitized = originalText;

  for (const span of sortedSpans) {
    const rawValue = originalText.slice(span.start, span.end);
    const { placeholder, isNew, entry } = vault.getOrCreatePlaceholder(span.type, rawValue);

    if (isNew) {
      vaultDelta.push(entry);
    }

    // Replace in string right-to-left
    sanitized = sanitized.slice(0, span.start) + placeholder + sanitized.slice(span.end);
  }

  return {
    sanitized,
    spans: resolvedSpans,
    vaultDelta,
    mode,
    degradedChunks,
  };
}
