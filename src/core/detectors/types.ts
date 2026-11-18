import { EntityType, SpanConfidence } from '../../shared/types';

export interface DetectorContext {
  fullText: string;
  normalized: string;
  customTerms?: string[];
  strictMode?: boolean;
}

export type Verdict =
  | { match: false }
  | {
      match: true;
      confidence: SpanConfidence;
      reason?: string;
      overrideOffset?: { start: number; end: number };
    };

export interface Detector {
  id: string;
  type: EntityType;
  pack: 'GLOBAL' | 'US' | 'IN' | string;
  pattern: RegExp;
  captureGroup?: number;
  validate?: (candidate: string, ctx: DetectorContext, match: RegExpExecArray) => Verdict;
  reason: string;
  defaultConfidence?: SpanConfidence;
}
