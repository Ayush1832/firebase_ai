/**
 * Persistence Storage Adapters
 * Refines docs/12-EXTENSION-SPEC.md §5 and ADR-018.
 *
 * Enforces separation between:
 * - Session Storage (in-memory, cleared on reload/restart): Vault, Sanitized Conversation, Ledger
 * - Local Storage (persistent): Settings, Consent, Custom Terms, Tester Config
 *
 * Invariant L-5: Local storage must NEVER receive vault values or raw conversation text.
 */

import { ConsentState, LedgerEntry, VaultEntry } from '../shared/types';

export interface StorageArea {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAll(): Promise<Record<string, unknown>>;
}

/**
 * In-memory Storage Area for Node.js, unit tests, and fallback environments.
 */
export class MemoryStorageArea implements StorageArea {
  private data: Map<string, unknown> = new Map();

  async get<T>(key: string): Promise<T | undefined> {
    const val = this.data.get(key);
    if (val === undefined) return undefined;
    // Deep clone to mirror chrome.storage serialization behavior
    return JSON.parse(JSON.stringify(val)) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, JSON.parse(JSON.stringify(value)));
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async getAll(): Promise<Record<string, unknown>> {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of this.data.entries()) {
      obj[k] = JSON.parse(JSON.stringify(v));
    }
    return obj;
  }
}

/**
 * Chrome Extension chrome.storage adapter.
 */
export class ChromeStorageArea implements StorageArea {
  constructor(private area: 'local' | 'session') {}

  private getStorage(): chrome.storage.StorageArea | null {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage[this.area]) {
      return chrome.storage[this.area];
    }
    return null;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const s = this.getStorage();
    if (!s) return undefined;
    const res = await s.get(key);
    return res[key] as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const s = this.getStorage();
    if (!s) return;
    await s.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    const s = this.getStorage();
    if (!s) return;
    await s.remove(key);
  }

  async clear(): Promise<void> {
    const s = this.getStorage();
    if (!s) return;
    await s.clear();
  }

  async getAll(): Promise<Record<string, unknown>> {
    const s = this.getStorage();
    if (!s) return {};
    return await s.get(null);
  }
}

/**
 * High-level Persistence Manager enforcing privacy boundaries (L-5)
 */
export class PersistenceManager {
  constructor(
    public readonly session: StorageArea = new MemoryStorageArea(),
    public readonly local: StorageArea = new MemoryStorageArea()
  ) {}

  // Session: Vault
  async getVault(): Promise<VaultEntry[]> {
    return (await this.session.get<VaultEntry[]>('vault')) || [];
  }

  async saveVault(entries: VaultEntry[]): Promise<void> {
    await this.session.set('vault', entries);
  }

  // Session: Sanitized Conversation
  async getConversation<T>(): Promise<T[]> {
    return (await this.session.get<T[]>('conversation')) || [];
  }

  async saveConversation<T>(messages: T[]): Promise<void> {
    await this.session.set('conversation', messages);
  }

  // Session: Ledger
  async getLedger(): Promise<LedgerEntry[]> {
    return (await this.session.get<LedgerEntry[]>('ledger')) || [];
  }

  async appendLedgerEntry(entry: LedgerEntry): Promise<void> {
    const ledger = await this.getLedger();
    ledger.push(entry);
    await this.session.set('ledger', ledger);
  }

  // Local: Consent State
  async getConsent(): Promise<ConsentState | null> {
    return (await this.local.get<ConsentState>('consent')) || null;
  }

  async saveConsent(consent: ConsentState | null): Promise<void> {
    await this.local.set('consent', consent);
  }

  // Local: Custom Terms
  async getCustomTerms(): Promise<string[]> {
    return (await this.local.get<string[]>('customTerms')) || [];
  }

  async saveCustomTerms(terms: string[]): Promise<void> {
    await this.local.set('customTerms', terms);
  }

  // Local: Settings
  async getSettings(): Promise<{ strictMode: boolean; routingMode: 'auto' | 'on-device-only' | 'cloud-allowed' }> {
    const s = await this.local.get<{ strictMode: boolean; routingMode: 'auto' | 'on-device-only' | 'cloud-allowed' }>('settings');
    return s || { strictMode: false, routingMode: 'auto' };
  }

  async saveSettings(settings: { strictMode: boolean; routingMode: 'auto' | 'on-device-only' | 'cloud-allowed' }): Promise<void> {
    await this.local.set('settings', settings);
  }

  // Session: Clear session data
  async clearSessionData(): Promise<void> {
    await this.session.clear();
  }

  // Invariant L-5 Assertion: Audit storage to verify local never holds vault or conversation
  async assertStorageAudit(): Promise<{ valid: boolean; leakedKeys: string[] }> {
    const localAll = await this.local.getAll();
    const forbiddenKeys = ['vault', 'conversation'];
    const leakedKeys: string[] = [];

    for (const key of Object.keys(localAll)) {
      if (forbiddenKeys.includes(key)) {
        leakedKeys.push(key);
      }
    }

    return {
      valid: leakedKeys.length === 0,
      leakedKeys,
    };
  }
}
