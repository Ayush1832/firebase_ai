/**
 * End-to-End Privacy Pipeline Orchestrator
 * Refines docs/02-SYSTEM-DESIGN.md §1, §11.2 and docs/05-TASKS.md T-2.3.
 *
 * Sequence:
 * raw user text
 *   -> Chunker
 *   -> Layer 1: Rules (whole text, independent)
 *   -> Layer 2: Gemini Nano (if ready, chunk-by-chunk)
 *   -> Span Merge & Overlap Resolution
 *   -> Masker & Vault
 *   -> Safety Gate -> produces branded SanitizedText
 *
 * Emits progress events and supports cancellation via AbortSignal.
 */

import {
  GateResult,
  RawText,
  SanitizedText,
  Span,
  VaultEntry,
} from '../shared/types';
import { runDetectors } from '../core/detectors/engine';
import { Detector } from '../core/detectors/types';
import { chunkText, deduplicateSpans, shiftSpanToOriginal } from '../core/chunker';
import { resolveOverlaps, UserExclusion } from '../core/merge';
import { Vault } from '../core/vault';
import { maskText } from '../core/masker';
import { evaluateSafetyGate } from '../core/gate';
import { AiPort } from './types';
import { redactChunkOnDevice } from './wrapper';

export type PipelineStage =
  | 'idle'
  | 'rules'
  | 'nano'
  | 'merging'
  | 'masking'
  | 'gating'
  | 'complete';

export interface PipelineProgressEvent {
  stage: PipelineStage;
  chunkIndex?: number;
  totalChunks?: number;
  msElapsed: number;
  message: string;
}

export interface PipelineOptions {
  detectors: Detector[];
  aiPort: AiPort;
  vault: Vault;
  customTerms?: string[];
  strictMode?: boolean;
  userExclusions?: UserExclusion[];
  abortSignal?: AbortSignal;
  onProgress?: (event: PipelineProgressEvent) => void;
}

export interface PipelineResult {
  mode: 'full' | 'rules-only';
  degradedChunks: number[];
  spans: Span[];
  sanitized: string;
  vaultDelta: VaultEntry[];
  gateResult: GateResult;
  sanitizedText?: SanitizedText; // Available only if gate passed
}

export async function runPrivacyPipeline(
  rawText: RawText,
  options: PipelineOptions
): Promise<PipelineResult> {
  const startTime = performance.now();
  const emit = (stage: PipelineStage, msg: string, chunkIdx?: number, totalChunks?: number) => {
    if (options.onProgress) {
      options.onProgress({
        stage,
        chunkIndex: chunkIdx,
        totalChunks,
        msElapsed: performance.now() - startTime,
        message: msg,
      });
    }
  };

  if (options.abortSignal?.aborted) {
    throw new Error('Pipeline cancelled by user.');
  }

  // 1. Layer 1: Rules run on the whole text (never dependent on AI)
  emit('rules', 'Running deterministic rule detectors…');
  const ruleSpans = runDetectors(rawText, {
    detectors: options.detectors,
    customTerms: options.customTerms,
    strictMode: options.strictMode,
  });

  if (options.abortSignal?.aborted) {
    throw new Error('Pipeline cancelled by user.');
  }

  // 2. Layer 2: On-device Gemini Nano entity extraction
  const nanoSpans: Span[] = [];
  const degradedChunks: number[] = [];
  let mode: 'full' | 'rules-only' = 'rules-only';

  const availability = await options.aiPort.checkAvailability();

  if (availability === 'ready') {
    mode = 'full';
    const chunks = chunkText(rawText);
    const total = chunks.length;

    for (let i = 0; i < total; i++) {
      if (options.abortSignal?.aborted) {
        throw new Error('Pipeline cancelled by user.');
      }

      const chunk = chunks[i];
      emit('nano', `On-device AI scanning chunk ${i + 1} of ${total}…`, i + 1, total);

      if (chunk.isOverLimit) {
        // Exceeded budget: chunk is handled rules-only
        degradedChunks.push(i);
        continue;
      }

      const chunkRes = await redactChunkOnDevice(chunk.text, options.aiPort);
      if (chunkRes.degraded) {
        degradedChunks.push(i);
      } else {
        for (const s of chunkRes.spans) {
          nanoSpans.push(shiftSpanToOriginal(s, chunk));
        }
      }
    }
  }

  // Deduplicate overlapping chunk spans from Layer 2
  const dedupedNano = deduplicateSpans(nanoSpans);

  // 3. Merge & Overlap Resolution
  emit('merging', 'Resolving detector overlaps…');
  const allSpans = [...ruleSpans, ...dedupedNano];
  const resolvedSpans = resolveOverlaps(allSpans, options.userExclusions);

  // 4. Masking & Vault Registration (Right-to-Left)
  emit('masking', 'Masking sensitive entities into local vault…');
  const maskResult = maskText(rawText, resolvedSpans, options.vault, mode, degradedChunks);

  // 5. Deterministic Safety Gate
  emit('gating', 'Executing deterministic safety gate…');
  const gateResult = evaluateSafetyGate(maskResult.sanitized, {
    detectors: options.detectors,
    vault: options.vault,
    customTerms: options.customTerms,
    strictMode: options.strictMode,
  });

  emit('complete', 'Pipeline completed.');

  return {
    mode,
    degradedChunks,
    spans: resolvedSpans,
    sanitized: maskResult.sanitized,
    vaultDelta: maskResult.vaultDelta,
    gateResult,
    sanitizedText: gateResult.status === 'passed' ? gateResult.text : undefined,
  };
}
