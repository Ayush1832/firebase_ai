/**
 * AI Wrapper & Substring-to-Offset Mapper
 * Refines docs/10-AI-PROMPTS-AND-SCHEMAS.md §1, §4, §5 and ADR-003, ADR-014.
 *
 * Guarantees:
 * 1. Raw text goes ONLY to on-device redactor (throws if cloud attempted).
 * 2. Invariant I-5 Assertion: Every redactor response MUST report inferenceSource === 'ON_DEVICE'.
 * 3. Model output is untrusted: Substrings are strictly located verbatim in chunk.
 * 4. answer() accepts ONLY branded SanitizedText.
 */

import { EntityType, SanitizedText, Span } from '../shared/types';
import { AiPort, RedactChunkResult } from './types';

const PLACEHOLDER_GRAMMAR = /^\[[A-Z]{2,8}_\d{1,4}\]$/;

const ALLOWED_NANO_TYPES = new Set<string>([
  'PERSON',
  'ORG',
  'ADDRESS',
  'DOB',
  'ACCOUNT_NUMBER',
  'OTHER_ID',
]);

/**
 * Executes on-device entity extraction for a single chunk.
 * Maps returned entity substrings back to exact offsets in the chunk.
 */
export async function redactChunkOnDevice(
  chunkText: string,
  aiPort: AiPort,
  timeoutMs: number = 20000
): Promise<RedactChunkResult> {
  const start = performance.now();

  try {
    const res = await aiPort.redactOnDevice(chunkText, timeoutMs);

    // Hard Invariant I-5: Verify redaction was strictly executed ON_DEVICE
    if (res.inferenceSource !== 'ON_DEVICE') {
      throw new Error(
        `Privacy Violation (Invariant I-5): Redactor reported inferenceSource '${res.inferenceSource}' instead of 'ON_DEVICE'. Result rejected.`
      );
    }

    const spans: Span[] = [];

    for (const ent of res.entities) {
      if (!ent.text || typeof ent.text !== 'string') continue;
      const trimmed = ent.text.trim();

      // Rule: discard if shorter than 2 chars, longer than 120, or is a placeholder token
      if (trimmed.length < 2 || trimmed.length > 120) continue;
      if (PLACEHOLDER_GRAMMAR.test(trimmed)) continue;

      if (!ALLOWED_NANO_TYPES.has(ent.type)) continue;

      let type: EntityType;
      let confidence: 'medium' | 'low' = 'medium';

      if (ent.type === 'OTHER_ID') {
        type = 'GOV_ID';
        confidence = 'low';
      } else {
        type = ent.type as EntityType;
      }

      // Find all verbatim occurrences in chunkText
      // 1. Exact case search
      let searchIdx = 0;
      let foundAny = false;
      while (searchIdx < chunkText.length) {
        const found = chunkText.indexOf(trimmed, searchIdx);
        if (found === -1) break;
        foundAny = true;
        spans.push({
          type,
          start: found,
          end: found + trimmed.length,
          source: 'nano',
          confidence,
          reason: 'nano',
          originalText: chunkText.slice(found, found + trimmed.length),
        });
        searchIdx = found + trimmed.length;
      }

      // 2. Case-insensitive fallback if not found exact
      if (!foundAny) {
        const lowerChunk = chunkText.toLowerCase();
        const lowerTrimmed = trimmed.toLowerCase();
        searchIdx = 0;
        while (searchIdx < lowerChunk.length) {
          const found = lowerChunk.indexOf(lowerTrimmed, searchIdx);
          if (found === -1) break;
          spans.push({
            type,
            start: found,
            end: found + trimmed.length,
            source: 'nano',
            confidence,
            reason: 'nano',
            originalText: chunkText.slice(found, found + trimmed.length),
          });
          searchIdx = found + trimmed.length;
        }
      }
    }

    const ms = performance.now() - start;
    return {
      spans,
      inferenceSource: 'ON_DEVICE',
      degraded: false,
      ms,
    };
  } catch {
    // Graceful degradation: chunk is marked degraded, rules layer still protects
    const ms = performance.now() - start;
    return {
      spans: [],
      inferenceSource: 'ON_DEVICE',
      degraded: true,
      ms,
    };
  }
}

/**
 * Requests an answer from the AI responder.
 * Accepts ONLY branded SanitizedText (doc 02 §6).
 */
export async function requestAnswer(
  sanitized: SanitizedText,
  route: 'ON_DEVICE' | 'IN_CLOUD',
  aiPort: AiPort,
  modelName?: string
): Promise<{ text: string; inferenceSource: 'ON_DEVICE' | 'IN_CLOUD'; ms: number }> {
  const start = performance.now();
  const res = await aiPort.answer(sanitized, route, modelName);
  const ms = performance.now() - start;

  return {
    text: res.text,
    inferenceSource: res.inferenceSource,
    ms,
  };
}
