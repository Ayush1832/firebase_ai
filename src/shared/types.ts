/**
 * Core Data Models & Shared Types
 * Refines docs/02-SYSTEM-DESIGN.md §3, docs/09-DETECTOR-SPEC.md §2, and docs/12-EXTENSION-SPEC.md §4.
 */

export type EntityType =
  | 'PERSON'
  | 'ORG'
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'DOB'
  | 'CARD_NUMBER'
  | 'ACCOUNT_NUMBER'
  | 'IBAN'
  | 'ROUTING_OR_IFSC'
  | 'TAX_ID'
  | 'GOV_ID'
  | 'UPI_ID'
  | 'TXN_ID'
  | 'CREDENTIAL'
  | 'API_KEY'
  | 'AMOUNT'        // Off by default; strict mode only (ADR-007)
  | 'CUSTOM';       // User-defined always-mask terms

/**
 * Placeholder labels per doc 09 §2
 */
export const ENTITY_PLACEHOLDER_LABELS: Record<EntityType, string> = {
  PERSON: 'PERSON',
  ORG: 'ORG',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  ADDRESS: 'ADDR',
  DOB: 'DOB',
  CARD_NUMBER: 'CARD',
  ACCOUNT_NUMBER: 'ACCT',
  IBAN: 'IBAN',
  ROUTING_OR_IFSC: 'ROUTING',
  TAX_ID: 'TAXID',
  GOV_ID: 'GOVID',
  UPI_ID: 'UPI',
  TXN_ID: 'TXN',
  CREDENTIAL: 'SECRET',
  API_KEY: 'KEY',
  AMOUNT: 'AMT',
  CUSTOM: 'TERM',
};

/**
 * Branded Types for Safety Guarantees (Structural Invariant I-1, I-4)
 * Raw user text may only be passed to on-device redactor.
 * Answer models only accept SanitizedText produced by the Safety Gate.
 */
declare const RawTextBrand: unique symbol;
export type RawText = string & { readonly [RawTextBrand]: true };

export function asRawText(text: string): RawText {
  return text as RawText;
}

declare const SanitizedTextBrand: unique symbol;
export type SanitizedText = string & { readonly [SanitizedTextBrand]: true };

export function brandSanitizedText(text: string): SanitizedText {
  return text as SanitizedText;
}

export type SpanSource = 'rule' | 'nano' | 'user';
export type SpanConfidence = 'high' | 'medium' | 'low';

export interface Span {
  type: EntityType;
  start: number; // Start offset in the ORIGINAL text
  end: number;   // End offset in the ORIGINAL text
  source: SpanSource;
  confidence: SpanConfidence;
  reason: string; // e.g. 'luhn-ok', 'context:account', 'custom-term'
  originalText?: string;
}

export interface VaultEntry {
  placeholder: string;           // e.g. '[CARD_1]'
  type: EntityType;
  canonical: string;             // Canonicalized form for matching duplicates
  surfaceForms: string[];        // All surface appearances in original input
  isLiteral?: boolean;          // Collision avoidance: was already in the input
}

export type AvailabilityState =
  | 'unknown'
  | 'unavailable'
  | 'downloadable'
  | 'downloading'
  | 'ready'
  | 'degraded';

export interface MaskResult {
  sanitized: string;             // Intermediate masked string before safety gate
  spans: Span[];
  vaultDelta: VaultEntry[];
  mode: 'full' | 'rules-only';
  degradedChunks: number[];      // Chunk indexes processed without Nano
}

export type GateResult =
  | {
      status: 'passed';
      text: SanitizedText;
      remainingMedium: number;
    }
  | {
      status: 'blocked';
      leftovers: {
        type: EntityType;
        start: number;
        end: number;
      }[]; // Positions and types only, NEVER logged raw values!
    };

export interface RoutingDecision {
  route: 'ON_DEVICE' | 'IN_CLOUD';
  reason: string;
  modelName?: string;
}

export interface LedgerStep {
  name: 'detect-rules' | 'detect-nano' | 'gate' | 'answer' | 'restore';
  route: 'ON_DEVICE' | 'IN_CLOUD' | 'RULES';
  inferenceSource?: 'ON_DEVICE' | 'IN_CLOUD';
  model?: string;
  ms?: number;
  ok: boolean;
  note?: string;
}

export interface LedgerEntry {
  id: string;
  ts: number;
  counts: Partial<Record<EntityType, number>>;
  steps: LedgerStep[];
  rawLeftDevice: false;          // Hard Invariant asserted by gate
  mode: 'full' | 'rules-only';
  routing?: RoutingDecision;
  restore?: {
    restored: number;
    unknown: number;
    mangled: number;
  };
  consentVersion?: number;
}

export interface ConsentState {
  cloudAllowed: boolean;
  over18: boolean;
  regionOk: boolean;
  version: number;
  at: number;
}

export interface PolicyConfig {
  cloudModel: string;
  cloudKillSwitch: boolean;
  onDeviceTokenBudget: number;
  cloudTokenBudget: number;
  chunkChars: number;
  chunkOverlapChars: number;
  nanoChunkTimeoutMs: number;
  maxInputChars: number;
  strictMode: boolean;
  heavyTaskKeywords: string[];
  consentVersion: number;
}
