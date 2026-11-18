/**
 * Chunker for On-Device Model Requests
 * Refines docs/09-DETECTOR-SPEC.md §4.
 * Splits large texts into overlapping chunks that fit within Gemini Nano's token budget.
 */

import { Span } from '../shared/types';

export interface Chunk {
  index: number;
  text: string;
  startInOriginal: number;
  endInOriginal: number;
  isOverLimit?: boolean;
}

export interface ChunkOptions {
  chunkChars?: number;       // Default: 1500
  overlapChars?: number;     // Default: 150
  maxInputChars?: number;    // Default: 30000
  maxNanoChunks?: number;    // Default: 12
}

const DEFAULT_CHUNK_CHARS = 1500;
const DEFAULT_OVERLAP_CHARS = 150;
const DEFAULT_MAX_INPUT_CHARS = 30000;
const DEFAULT_MAX_NANO_CHUNKS = 12;

function findSafeSplitPoint(text: string, targetIndex: number, minIndex: number): number {
  if (targetIndex >= text.length) return text.length;

  // Search window backward from targetIndex
  const searchStart = Math.max(minIndex, targetIndex - 200);
  const windowText = text.slice(searchStart, targetIndex);

  // 1. Double newline (paragraph)
  const paragraphIndex = windowText.lastIndexOf('\n\n');
  if (paragraphIndex !== -1 && searchStart + paragraphIndex + 2 > minIndex) {
    return searchStart + paragraphIndex + 2;
  }

  // 2. Single newline
  const newlineIndex = windowText.lastIndexOf('\n');
  if (newlineIndex !== -1 && searchStart + newlineIndex + 1 > minIndex) {
    return searchStart + newlineIndex + 1;
  }

  // 3. Sentence terminator (. ! ?) followed by whitespace
  const sentenceMatch = /[.!?]\s+(?=[^\s])/g;
  let lastSentenceIdx = -1;
  let m: RegExpExecArray | null;
  while ((m = sentenceMatch.exec(windowText)) !== null) {
    lastSentenceIdx = m.index + m[0].length;
  }
  if (lastSentenceIdx !== -1 && searchStart + lastSentenceIdx > minIndex) {
    return searchStart + lastSentenceIdx;
  }

  // 4. Whitespace
  const spaceIndex = windowText.lastIndexOf(' ');
  if (spaceIndex !== -1 && searchStart + spaceIndex + 1 > minIndex) {
    return searchStart + spaceIndex + 1;
  }

  // Fallback to targetIndex
  return targetIndex;
}

export function chunkText(text: string, options?: ChunkOptions): Chunk[] {
  if (!text || text.length === 0) return [];

  const chunkChars = options?.chunkChars ?? DEFAULT_CHUNK_CHARS;
  const overlapChars = options?.overlapChars ?? DEFAULT_OVERLAP_CHARS;
  const maxInputChars = options?.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS;
  const maxNanoChunks = options?.maxNanoChunks ?? DEFAULT_MAX_NANO_CHUNKS;

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    if (start >= maxInputChars || index >= maxNanoChunks) {
      // Input beyond limits is marked over limit (rules-only)
      chunks.push({
        index,
        text: text.slice(start),
        startInOriginal: start,
        endInOriginal: text.length,
        isOverLimit: true,
      });
      break;
    }

    const rawEnd = Math.min(start + chunkChars, text.length);
    let end = rawEnd;

    if (end < text.length) {
      // Find safe boundary
      const safeBoundary = findSafeSplitPoint(text, rawEnd, start + Math.floor(chunkChars * 0.5));
      end = safeBoundary;
    }

    chunks.push({
      index,
      text: text.slice(start, end),
      startInOriginal: start,
      endInOriginal: end,
      isOverLimit: false,
    });

    index++;
    if (end >= text.length) break;

    // Advance start considering overlap
    const nextStart = Math.max(start + 1, end - overlapChars);
    start = nextStart;
  }

  return chunks;
}

/**
 * Shifts a span detected inside a chunk back to original text offsets.
 */
export function shiftSpanToOriginal(span: Span, chunk: Chunk): Span {
  return {
    ...span,
    start: span.start + chunk.startInOriginal,
    end: span.end + chunk.startInOriginal,
  };
}

/**
 * Deduplicates spans with identical (start, end, type).
 */
export function deduplicateSpans(spans: Span[]): Span[] {
  const seen = new Set<string>();
  const result: Span[] = [];

  for (const s of spans) {
    const key = `${s.start}:${s.end}:${s.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(s);
    }
  }

  return result;
}
