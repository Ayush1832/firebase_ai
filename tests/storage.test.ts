import { describe, it, expect } from 'vitest';
import { MemoryStorageArea, PersistenceManager } from '../src/core/storage';
import { VaultEntry, ConsentState } from '../src/shared/types';

describe('T-1.14: Persistence Adapters & Invariant L-5', () => {
  it('saves and retrieves vault and conversation in session storage', () => {
    const session = new MemoryStorageArea();
    const local = new MemoryStorageArea();
    const manager = new PersistenceManager(session, local);

    const vaultData: VaultEntry[] = [
      {
        placeholder: '[CARD_1]',
        type: 'CARD_NUMBER',
        canonical: '4242424242424242',
        surfaceForms: ['4242 4242 4242 4242'],
      },
    ];

    manager.saveVault(vaultData).then(async () => {
      const retrieved = await manager.getVault();
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].placeholder).toBe('[CARD_1]');
    });
  });

  it('persists consent and custom terms in local storage', async () => {
    const session = new MemoryStorageArea();
    const local = new MemoryStorageArea();
    const manager = new PersistenceManager(session, local);

    const consent: ConsentState = {
      cloudAllowed: true,
      over18: true,
      regionOk: true,
      version: 1,
      at: Date.now(),
    };

    await manager.saveConsent(consent);
    await manager.saveCustomTerms(['AcmeCorp', 'SecretProject']);

    const retrievedConsent = await manager.getConsent();
    const retrievedTerms = await manager.getCustomTerms();

    expect(retrievedConsent?.cloudAllowed).toBe(true);
    expect(retrievedTerms).toEqual(['AcmeCorp', 'SecretProject']);
  });

  it('Invariant L-5 Storage Audit: asserts local storage NEVER holds vault or conversation keys', async () => {
    const session = new MemoryStorageArea();
    const local = new MemoryStorageArea();
    const manager = new PersistenceManager(session, local);

    await manager.saveVault([
      {
        placeholder: '[CARD_1]',
        type: 'CARD_NUMBER',
        canonical: '4242424242424242',
        surfaceForms: ['4242 4242 4242 4242'],
      },
    ]);
    await manager.saveConsent({
      cloudAllowed: true,
      over18: true,
      regionOk: true,
      version: 1,
      at: Date.now(),
    });

    const audit = await manager.assertStorageAudit();
    expect(audit.valid).toBe(true);
    expect(audit.leakedKeys).toEqual([]);

    // If something maliciously writes 'vault' directly to local storage:
    await local.set('vault', 'leaked');
    const failedAudit = await manager.assertStorageAudit();
    expect(failedAudit.valid).toBe(false);
    expect(failedAudit.leakedKeys).toContain('vault');
  });
});
