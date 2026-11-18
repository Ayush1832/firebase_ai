/**
 * Deterministic Safety Gate
 * Refines docs/09-DETECTOR-SPEC.md §9.3.
 *
 * Hard privacy gate that asserts:
 * 1. Zero leftover high-confidence sensitive entities in sanitized text.
 * 2. Zero leaked vault values (length >= 4) in sanitized text.
 * 3. Chunk boundaries are safe.
 *
 * ONLY this gate can produce branded `SanitizedText` accepted by answer models.
 */

import { GateResult, brandSanitizedText } from '../shared/types';
import { runDetectors } from './detectors/engine';
import { Detector } from './detectors/types';
import { Vault } from './vault';

export interface GateOptions {
  detectors: Detector[];
  vault: Vault;
  customTerms?: string[];
  strictMode?: boolean;
  chunkBoundaries?: number[];
}

export function evaluateSafetyGate(
  sanitizedText: string,
  options: GateOptions
): GateResult {
  if (!sanitizedText || sanitizedText.length === 0) {
    return {
      status: 'passed',
      text: brandSanitizedText(''),
      remainingMedium: 0,
    };
  }

  // 1. Re-run all Layer 1 deterministic detectors on the sanitized text
  const rescanSpans = runDetectors(sanitizedText, {
    detectors: options.detectors,
    customTerms: options.customTerms,
    strictMode: options.strictMode,
  });

  // 2. Check for leftover HIGH confidence spans
  const highSpans = rescanSpans.filter((s) => s.confidence === 'high');
  if (highSpans.length > 0) {
    return {
      status: 'blocked',
      leftovers: highSpans.map((s) => ({
        type: s.type,
        start: s.start,
        end: s.end,
      })),
    };
  }

  // 3. Vault value scan: Ensure no raw vault surface form (length >= 4) appears verbatim
  const lowerSanitized = sanitizedText.toLowerCase();
  for (const entry of options.vault.getAllEntries()) {
    if (entry.isLiteral) continue;

    for (const surfaceForm of entry.surfaceForms) {
      const cleanForm = surfaceForm.trim();
      if (cleanForm.length < 4) continue;

      const isCaseInsensitive =
        entry.type === 'PERSON' ||
        entry.type === 'ORG' ||
        entry.type === 'ADDRESS' ||
        entry.type === 'CUSTOM';

      const idx = isCaseInsensitive
        ? lowerSanitized.indexOf(cleanForm.toLowerCase())
        : sanitizedText.indexOf(cleanForm);

      if (idx !== -1) {
        return {
          status: 'blocked',
          leftovers: [
            {
              type: entry.type,
              start: idx,
              end: idx + cleanForm.length,
            },
          ],
        };
      }
    }
  }

  // 4. Chunk boundary window scan (40 chars around former boundaries)
  if (options.chunkBoundaries && options.chunkBoundaries.length > 0) {
    for (const boundary of options.chunkBoundaries) {
      const windowStart = Math.max(0, boundary - 20);
      const windowEnd = Math.min(sanitizedText.length, boundary + 20);
      const boundarySlice = sanitizedText.slice(windowStart, windowEnd);

      const boundarySpans = runDetectors(boundarySlice, {
        detectors: options.detectors,
        strictMode: options.strictMode,
      });

      const highBoundary = boundarySpans.filter((s) => s.confidence === 'high');
      if (highBoundary.length > 0) {
        return {
          status: 'blocked',
          leftovers: highBoundary.map((s) => ({
            type: s.type,
            start: windowStart + s.start,
            end: windowStart + s.end,
          })),
        };
      }
    }
  }

  const remainingMedium = rescanSpans.filter(
    (s) => s.confidence === 'medium' || s.confidence === 'low'
  ).length;

  return {
    status: 'passed',
    text: brandSanitizedText(sanitizedText),
    remainingMedium,
  };
}
