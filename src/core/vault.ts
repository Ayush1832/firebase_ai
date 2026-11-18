/**
 * Local Privacy Vault
 * Refines docs/09-DETECTOR-SPEC.md §9.1 and §9.2.
 * Lives in memory / chrome.storage.session only.
 * Maps sensitive canonical values to stable typed placeholders like [CARD_1].
 */

import { EntityType, ENTITY_PLACEHOLDER_LABELS, VaultEntry } from '../shared/types';

export const PLACEHOLDER_REGEX = /\[([A-Z]{2,8})_(\d{1,4})\]/g;

export class Vault {
  private entries: Map<string, VaultEntry> = new Map(); // placeholder -> VaultEntry
  private canonicalMap: Map<string, string> = new Map(); // `${type}:${canonical}` -> placeholder
  private labelCounters: Map<string, number> = new Map(); // label -> last allocated index
  private literalTokens: Set<string> = new Set(); // Pre-existing tokens in user input (T-11)

  constructor(initialEntries: VaultEntry[] = []) {
    for (const entry of initialEntries) {
      this.entries.set(entry.placeholder, entry);
      if (!entry.isLiteral) {
        this.canonicalMap.set(`${entry.type}:${entry.canonical}`, entry.placeholder);
      } else {
        this.literalTokens.add(entry.placeholder);
      }

      // Track max counter
      const match = /\[([A-Z]{2,8})_(\d{1,4})\]/.exec(entry.placeholder);
      if (match) {
        const label = match[1];
        const num = parseInt(match[2], 10);
        const curr = this.labelCounters.get(label) || 0;
        if (num > curr) {
          this.labelCounters.set(label, num);
        }
      }
    }
  }

  /**
   * Canonicalizes a sensitive value per doc 09 §9.1
   */
  public canonicalize(value: string, type: EntityType): string {
    switch (type) {
      case 'CARD_NUMBER':
      case 'ACCOUNT_NUMBER':
      case 'IBAN':
      case 'PHONE':
      case 'GOV_ID':
      case 'TAX_ID':
      case 'ROUTING_OR_IFSC':
      case 'UPI_ID':
        return value.replace(/[\s\-.]/g, '').toUpperCase();

      case 'EMAIL':
        return value.trim().toLowerCase();

      case 'PERSON':
      case 'ORG':
      case 'ADDRESS':
      case 'CUSTOM':
        return value.trim().replace(/\s+/g, ' ').toLowerCase();

      case 'DOB': {
        // Attempt ISO parse or trim
        const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
        if (isoMatch) return value.trim();
        return value.trim().replace(/\s+/g, ' ').toLowerCase();
      }

      case 'CREDENTIAL':
      case 'API_KEY':
      default:
        return value; // Exact preservation for secrets/keys
    }
  }

  /**
   * Collision avoidance (threat T-11):
   * Scans input for pre-existing placeholder-like tokens and adjusts counters so new
   * placeholders never collide with existing user text.
   */
  public registerExistingTokens(input: string): void {
    let match: RegExpExecArray | null;
    const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');

    while ((match = regex.exec(input)) !== null) {
      const fullToken = match[0];
      const label = match[1];
      const num = parseInt(match[2], 10);

      this.literalTokens.add(fullToken);
      const currentMax = this.labelCounters.get(label) || 0;
      if (num >= currentMax) {
        this.labelCounters.set(label, num);
      }
    }
  }

  /**
   * Gets or allocates a placeholder for a sensitive value.
   */
  public getOrCreatePlaceholder(
    type: EntityType,
    originalValue: string
  ): { placeholder: string; isNew: boolean; entry: VaultEntry } {
    const canonical = this.canonicalize(originalValue, type);
    const key = `${type}:${canonical}`;

    const existingPlaceholder = this.canonicalMap.get(key);
    if (existingPlaceholder) {
      const entry = this.entries.get(existingPlaceholder)!;
      if (!entry.surfaceForms.includes(originalValue)) {
        entry.surfaceForms.push(originalValue);
      }
      return { placeholder: existingPlaceholder, isNew: false, entry };
    }

    // Allocate new placeholder
    const label = ENTITY_PLACEHOLDER_LABELS[type] || 'TERM';
    const nextNum = (this.labelCounters.get(label) || 0) + 1;
    this.labelCounters.set(label, nextNum);

    const placeholder = `[${label}_${nextNum}]`;
    const entry: VaultEntry = {
      placeholder,
      type,
      canonical,
      surfaceForms: [originalValue],
      isLiteral: false,
    };

    this.entries.set(placeholder, entry);
    this.canonicalMap.set(key, placeholder);

    return { placeholder, isNew: true, entry };
  }

  public get(placeholder: string): VaultEntry | undefined {
    return this.entries.get(placeholder);
  }

  public isLiteral(placeholder: string): boolean {
    return this.literalTokens.has(placeholder);
  }

  public getAllEntries(): VaultEntry[] {
    return Array.from(this.entries.values());
  }
}
