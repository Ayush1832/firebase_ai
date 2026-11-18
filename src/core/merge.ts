/**
 * Span Merge & Overlap Resolution
 * Refines docs/09-DETECTOR-SPEC.md §8.
 * Resolves overlapping spans deterministically:
 * - Rules never lose to lower confidence model spans
 * - Identical range -> higher confidence wins, union of reasons preserved
 * - Containment -> high confidence splits lower confidence wrapper
 * - Partial overlap -> higher confidence truncates lower confidence
 */

import { Span, SpanConfidence, SpanSource } from '../shared/types';

export interface UserExclusion {
  start: number;
  end: number;
  type: string;
  confirmedHigh?: boolean;
}

const CONFIDENCE_SCORE: Record<SpanConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const SOURCE_SCORE: Record<SpanSource, number> = {
  rule: 3,
  nano: 2,
  user: 1,
};

function compareSpans(a: Span, b: Span): number {
  if (a.start !== b.start) {
    return a.start - b.start;
  }
  const lenA = a.end - a.start;
  const lenB = b.end - b.start;
  if (lenA !== lenB) {
    return lenB - lenA; // Longer first
  }
  const confDiff = CONFIDENCE_SCORE[b.confidence] - CONFIDENCE_SCORE[a.confidence];
  if (confDiff !== 0) return confDiff;
  return SOURCE_SCORE[b.source] - SOURCE_SCORE[a.source];
}

function unionReasons(a: Span, b: Span): string {
  const parts = new Set([a.reason, b.reason].filter(Boolean));
  return Array.from(parts).join(' | ');
}

export function resolveOverlaps(
  spans: Span[],
  exclusions: UserExclusion[] = []
): Span[] {
  if (spans.length === 0) return [];

  // Filter out excluded spans (unless exclusion is on a 'high' span without second confirmation)
  const activeSpans = spans.filter((span) => {
    for (const ex of exclusions) {
      if (ex.start === span.start && ex.end === span.end && ex.type === span.type) {
        if (span.confidence === 'high' && !ex.confirmedHigh) {
          // Rule: high-confidence span cannot be unmasked without second confirmation
          return true;
        }
        return false;
      }
    }
    return true;
  });

  if (activeSpans.length === 0) return [];

  // Sort spans
  let queue = [...activeSpans].sort(compareSpans);
  const resolved: Span[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.start >= current.end) continue;

    let hasOverlap = false;

    for (let i = 0; i < queue.length; i++) {
      const next = queue[i];
      if (next.start >= current.end) {
        // Since queue is sorted by start, no subsequent spans can overlap with current
        break;
      }

      // Check overlap conditions
      hasOverlap = true;
      queue.splice(i, 1); // Remove next to resolve with current

      // 1. Identical range
      if (current.start === next.start && current.end === next.end) {
        const confA = CONFIDENCE_SCORE[current.confidence];
        const confB = CONFIDENCE_SCORE[next.confidence];
        const winner = confA >= confB ? current : next;
        winner.reason = unionReasons(current, next);
        queue.unshift(winner);
        queue.sort(compareSpans);
        break;
      }

      // 2. Current contains Next (current.start <= next.start && current.end >= next.end)
      if (current.start <= next.start && current.end >= next.end) {
        const confCurr = CONFIDENCE_SCORE[current.confidence];
        const confNext = CONFIDENCE_SCORE[next.confidence];

        if (confNext > confCurr) {
          // Next is higher confidence! Split current around next
          const fragments: Span[] = [];
          if (next.start > current.start) {
            fragments.push({
              ...current,
              start: current.start,
              end: next.start,
            });
          }
          fragments.push({
            ...next,
            reason: unionReasons(next, current),
          });
          if (current.end > next.end) {
            fragments.push({
              ...current,
              start: next.end,
              end: current.end,
            });
          }
          queue.push(...fragments);
          queue.sort(compareSpans);
          break;
        } else {
          // Current is equal or higher confidence: current absorbs next
          current.reason = unionReasons(current, next);
          queue.unshift(current);
          queue.sort(compareSpans);
          break;
        }
      }

      // 3. Partial overlap (current.start < next.start < current.end < next.end)
      const confCurr = CONFIDENCE_SCORE[current.confidence];
      const confNext = CONFIDENCE_SCORE[next.confidence];

      if (confCurr >= confNext) {
        // Current wins; truncate next to start at current.end
        const truncatedNext: Span = {
          ...next,
          start: current.end,
        };
        queue.push(current);
        if (truncatedNext.start < truncatedNext.end) {
          queue.push(truncatedNext);
        }
        queue.sort(compareSpans);
        break;
      } else {
        // Next wins; truncate current to end at next.start
        const truncatedCurrent: Span = {
          ...current,
          end: next.start,
        };
        if (truncatedCurrent.start < truncatedCurrent.end) {
          queue.push(truncatedCurrent);
        }
        queue.push(next);
        queue.sort(compareSpans);
        break;
      }
    }

    if (!hasOverlap) {
      resolved.push(current);
    }
  }

  return resolved.sort((a, b) => a.start - b.start);
}
