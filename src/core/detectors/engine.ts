/**
 * Rule Detector Engine (Layer 1)
 * Refines docs/09-DETECTOR-SPEC.md §5.
 * Executes deterministic rules on normalized text, validates checksums/contexts,
 * and maps all resulting spans back to original text offsets.
 */

import { Span } from '../../shared/types';
import { normalize } from '../normalize';
import { Detector, DetectorContext } from './types';

export interface RunDetectorsOptions {
  detectors: Detector[];
  customTerms?: string[];
  strictMode?: boolean;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function runDetectors(
  originalText: string,
  options: RunDetectorsOptions
): Span[] {
  if (!originalText || originalText.length === 0) return [];

  const { normalized, mapSpan } = normalize(originalText);
  const ctx: DetectorContext = {
    fullText: originalText,
    normalized,
    customTerms: options.customTerms,
    strictMode: options.strictMode,
  };

  const spans: Span[] = [];

  // 1. Run User Custom Terms (Highest Confidence)
  if (options.customTerms && options.customTerms.length > 0) {
    for (const term of options.customTerms) {
      const trimmed = term.trim();
      if (!trimmed) continue;

      const escaped = escapeRegex(trimmed);
      const isWord = /^\w+$/.test(trimmed);
      const pattern = isWord
        ? new RegExp(`\\b${escaped}\\b`, 'gi')
        : new RegExp(escaped, 'gi');

      let match: RegExpExecArray | null;
      while ((match = pattern.exec(normalized)) !== null) {
        const normStart = match.index;
        const normEnd = match.index + match[0].length;
        const origSpan = mapSpan(normStart, normEnd);

        spans.push({
          type: 'CUSTOM',
          start: origSpan.start,
          end: origSpan.end,
          source: 'rule',
          confidence: 'high',
          reason: 'custom-term',
          originalText: originalText.slice(origSpan.start, origSpan.end),
        });
      }
    }
  }

  // 2. Run Pack Detectors
  for (const detector of options.detectors) {
    // Clone regex with sticky/global safety
    const flags = detector.pattern.flags.includes('g')
      ? detector.pattern.flags
      : detector.pattern.flags + 'g';
    const regex = new RegExp(detector.pattern.source, flags);

    let match: RegExpExecArray | null;
    while ((match = regex.exec(normalized)) !== null) {
      let candidate = match[0];
      let normStart = match.index;

      if (detector.captureGroup !== undefined && match[detector.captureGroup] !== undefined) {
        candidate = match[detector.captureGroup];
        // Offset within match[0]
        const groupOffset = match[0].indexOf(candidate);
        normStart = match.index + (groupOffset >= 0 ? groupOffset : 0);
      }

      const normEnd = normStart + candidate.length;

      let confidence = detector.defaultConfidence ?? 'medium';
      let reason = detector.reason;

      if (detector.validate) {
        const verdict = detector.validate(candidate, ctx, match);
        if (!verdict.match) {
          continue;
        }
        if (verdict.confidence) confidence = verdict.confidence;
        if (verdict.reason) reason = verdict.reason;
      }

      const origSpan = mapSpan(normStart, normEnd);

      spans.push({
        type: detector.type,
        start: origSpan.start,
        end: origSpan.end,
        source: 'rule',
        confidence,
        reason,
        originalText: originalText.slice(origSpan.start, origSpan.end),
      });
    }
  }

  return spans;
}
