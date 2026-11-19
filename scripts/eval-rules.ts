/**
 * Rules Layer Evaluation Harness
 * Refines docs/06-TEST-AND-EVAL-PLAN.md §5 & §6.
 *
 * Evaluates deterministic rule detectors against the synthetic corpus.
 * Reports Recall and Precision per entity type for dev and held-out splits.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { runDetectors } from '../src/core/detectors/engine';
import { GLOBAL_PACK } from '../src/core/packs/global';
import { US_PACK } from '../src/core/packs/us';
import { IN_PACK } from '../src/core/packs/in';
import { generateCorpus, CorpusSample } from './gen-corpus';

const ALL_DETECTORS = [...GLOBAL_PACK, ...US_PACK, ...IN_PACK];

export interface TypeMetrics {
  labeled: number;
  detected: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  recall: number;
  precision: number;
}

export interface EvalReport {
  split: 'dev' | 'held-out' | 'all';
  totalSamples: number;
  byType: Record<string, TypeMetrics>;
  structuredRecall: number;
  overallPrecision: number;
}

// Calculate character overlap ratio between two strings / ranges
function hasOverlap(
  predStart: number,
  predEnd: number,
  targetStart: number,
  targetEnd: number
): boolean {
  return predStart < targetEnd && predEnd > targetStart;
}

export function evaluateRules(split: 'dev' | 'held-out' | 'all' = 'dev'): EvalReport {
  let samples: CorpusSample[];
  const corpusPath = resolve('fixtures/corpus.jsonl');

  if (existsSync(corpusPath)) {
    const rawLines = readFileSync(corpusPath, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    samples = rawLines.map((l) => JSON.parse(l));
  } else {
    samples = generateCorpus();
  }

  const filtered = split === 'all' ? samples : samples.filter((s) => s.split === split);

  const stats: Record<string, { labeled: number; detected: number; tp: number; fp: number }> = {};

  function ensureType(t: string) {
    if (!stats[t]) {
      stats[t] = { labeled: 0, detected: 0, tp: 0, fp: 0 };
    }
  }

  for (const sample of filtered) {
    // 1. Label ground-truth entities
    const groundTruth: { type: string; start: number; end: number; text: string; matched: boolean }[] = [];
    for (const ent of sample.entities) {
      ensureType(ent.type);
      stats[ent.type].labeled++;

      // Find occurrences in original text
      let searchIdx = 0;
      while (searchIdx < sample.text.length) {
        const foundAt = sample.text.indexOf(ent.text, searchIdx);
        if (foundAt === -1) break;
        groundTruth.push({
          type: ent.type,
          start: foundAt,
          end: foundAt + ent.text.length,
          text: ent.text,
          matched: false,
        });
        searchIdx = foundAt + ent.text.length;
      }
    }

    // 2. Run rule detectors
    const detectedSpans = runDetectors(sample.text, { detectors: ALL_DETECTORS });

    for (const span of detectedSpans) {
      ensureType(span.type);
      stats[span.type].detected++;

      // Check if predicted span matches any ground truth entity
      const match = groundTruth.find((gt) => {
        if (gt.type !== span.type) return false;
        return hasOverlap(span.start, span.end, gt.start, gt.end);
      });

      if (match) {
        stats[span.type].tp++;
        match.matched = true;
      } else {
        // Did not match ground truth
        stats[span.type].fp++;
      }
    }
  }

  const byType: Record<string, TypeMetrics> = {};
  let structuredLabeled = 0;
  let structuredTp = 0;
  let totalTp = 0;
  let totalDetected = 0;

  const STRUCTURED_TYPES = new Set([
    'CARD_NUMBER',
    'ACCOUNT_NUMBER',
    'IBAN',
    'ROUTING_OR_IFSC',
    'TAX_ID',
    'GOV_ID',
    'UPI_ID',
    'EMAIL',
    'PHONE',
    'API_KEY',
    'CREDENTIAL',
  ]);

  for (const [t, data] of Object.entries(stats)) {
    const fn = Math.max(0, data.labeled - data.tp);
    const recall = data.labeled > 0 ? (data.tp / data.labeled) * 100 : 100;
    const precision = data.detected > 0 ? (data.tp / data.detected) * 100 : 100;

    byType[t] = {
      labeled: data.labeled,
      detected: data.detected,
      truePositives: data.tp,
      falsePositives: data.fp,
      falseNegatives: fn,
      recall,
      precision,
    };

    if (STRUCTURED_TYPES.has(t)) {
      structuredLabeled += data.labeled;
      structuredTp += data.tp;
    }
    totalTp += data.tp;
    totalDetected += data.detected;
  }

  const structuredRecall = structuredLabeled > 0 ? (structuredTp / structuredLabeled) * 100 : 100;
  const overallPrecision = totalDetected > 0 ? (totalTp / totalDetected) * 100 : 100;

  return {
    split,
    totalSamples: filtered.length,
    byType,
    structuredRecall,
    overallPrecision,
  };
}

// Print report if run directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('eval-rules')) {
  console.log('=== Privacy Router Rules Layer Evaluation (Dev Split) ===\n');
  const report = evaluateRules('dev');

  console.table(
    Object.entries(report.byType).map(([type, m]) => ({
      'Entity Type': type,
      Labeled: m.labeled,
      Detected: m.detected,
      'Recall (%)': m.recall.toFixed(1) + '%',
      'Precision (%)': m.precision.toFixed(1) + '%',
    }))
  );

  console.log(`\nStructured Identifiers Recall: ${report.structuredRecall.toFixed(1)}%`);
  console.log(`Overall Rules Precision: ${report.overallPrecision.toFixed(1)}%`);
}
