/**
 * Internal Extension Messaging Protocol
 * Refines docs/12-EXTENSION-SPEC.md §4.
 * All messages are internal to local extension contexts.
 */

import { AvailabilityState, EntityType } from './types';

export interface BaseMsg<T extends string, P> {
  v: 1;
  id: string;
  type: T;
  payload: P;
}

export type EngineReadyMsg = BaseMsg<'ENGINE_READY', { state: AvailabilityState }>;
export type EngineGoneMsg = BaseMsg<'ENGINE_GONE', Record<string, never>>;

export type GuardScanMsg = BaseMsg<
  'GUARD_SCAN',
  {
    requestId: string;
    siteId: 'chatgpt' | 'claude' | 'gemini';
    text: string;
  }
>;

export type GuardScanResultMsg = BaseMsg<
  'GUARD_SCAN_RESULT',
  {
    requestId: string;
    status: 'masked' | 'blocked' | 'no-engine' | 'degraded' | 'error';
    sanitized?: string;
    counts: Partial<Record<EntityType, number>>;
    mode: 'full' | 'rules-only';
    reduced: boolean;
    reviewRequired: boolean;
  }
>;

export type GuardConfirmMsg = BaseMsg<
  'GUARD_CONFIRM',
  {
    requestId: string;
    accepted: boolean;
  }
>;

export type OpenPanelMsg = BaseMsg<'OPEN_PANEL', { reason: 'engine-needed' }>;

export type SettingsChangedMsg = BaseMsg<'SETTINGS_CHANGED', { keys: string[] }>;

export type ExtensionMessage =
  | EngineReadyMsg
  | EngineGoneMsg
  | GuardScanMsg
  | GuardScanResultMsg
  | GuardConfirmMsg
  | OpenPanelMsg
  | SettingsChangedMsg;
