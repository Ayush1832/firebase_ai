import { useState, useEffect } from 'react';
import { UserRoutePreference } from '../../core/policy';
import { ChromeStorageArea, MemoryStorageArea, PersistenceManager } from '../../core/storage';

export function OptionsApp() {
  const [activeTab, setActiveTab] = useState<'general' | 'detection' | 'privacy' | 'terms' | 'advanced' | 'about'>('general');
  const [sessionStorageArea] = useState(() => {
    return typeof chrome !== 'undefined' && chrome.storage
      ? new ChromeStorageArea('session')
      : new MemoryStorageArea();
  });
  const [localStorageArea] = useState(() => {
    return typeof chrome !== 'undefined' && chrome.storage
      ? new ChromeStorageArea('local')
      : new MemoryStorageArea();
  });
  const [persistence] = useState(() => new PersistenceManager(sessionStorageArea, localStorageArea));

  // Settings State
  const [strictMode, setStrictMode] = useState(false);
  const [routingMode, setRoutingMode] = useState<UserRoutePreference>('auto');
  const [packUs, setPackUs] = useState(true);
  const [packIn, setPackIn] = useState(true);
  const [consentGranted, setConsentGranted] = useState(false);
  const [consentDate, setConsentDate] = useState<string | null>(null);
  const [customTerms, setCustomTerms] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState('');

  // Tester Config State
  const [appCheckDebugToken, setAppCheckDebugToken] = useState('');
  const [cloudModelOverride, setCloudModelOverride] = useState('');
  const [firebaseConfigOverride, setFirebaseConfigOverride] = useState('');
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    // Load stored settings
    persistence.getSettings().then((s) => {
      setStrictMode(s.strictMode);
      setRoutingMode(s.routingMode);
    });

    persistence.getConsent().then((c) => {
      if (c) {
        setConsentGranted(c.cloudAllowed && c.over18 && c.regionOk);
        setConsentDate(c.at ? new Date(c.at).toLocaleDateString() : null);
      }
    });

    persistence.getCustomTerms().then((terms) => {
      setCustomTerms(terms);
    });

    // Load tester config from storage
    localStorageArea.get<string>('app_check_debug_token').then((t) => {
      if (t) setAppCheckDebugToken(t);
    });
    localStorageArea.get<string>('cloud_model_override').then((m) => {
      if (m) setCloudModelOverride(m);
    });
    localStorageArea.get<string>('firebase_config_override').then((cfg) => {
      if (cfg) setFirebaseConfigOverride(cfg);
    });
    localStorageArea.get<boolean>('pack_us_enabled').then((en) => {
      if (typeof en === 'boolean') setPackUs(en);
    });
    localStorageArea.get<boolean>('pack_in_enabled').then((en) => {
      if (typeof en === 'boolean') setPackIn(en);
    });
  }, [persistence, localStorageArea]);

  const showSaveSuccess = () => {
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const handleSaveGeneral = async () => {
    await persistence.saveSettings({ strictMode, routingMode });
    showSaveSuccess();
  };

  const handleSaveDetection = async () => {
    await localStorageArea.set('pack_us_enabled', packUs);
    await localStorageArea.set('pack_in_enabled', packIn);
    showSaveSuccess();
  };

  const handleRevokeConsent = async () => {
    await persistence.saveConsent({
      cloudAllowed: false,
      over18: false,
      regionOk: false,
      version: 1,
      at: Date.now(),
    });
    setConsentGranted(false);
    setConsentDate(null);
    showSaveSuccess();
  };

  const handleClearSession = async () => {
    await persistence.clearSessionData();
    alert('Session data, vault mappings, and conversation history cleared.');
  };

  const handleAddTerm = async () => {
    const trimmed = newTerm.trim();
    if (!trimmed || customTerms.includes(trimmed)) return;
    const updated = [...customTerms, trimmed];
    setCustomTerms(updated);
    setNewTerm('');
    await persistence.saveCustomTerms(updated);
    showSaveSuccess();
  };

  const handleRemoveTerm = async (term: string) => {
    const updated = customTerms.filter((t) => t !== term);
    setCustomTerms(updated);
    await persistence.saveCustomTerms(updated);
    showSaveSuccess();
  };

  const handleSaveTesterConfig = async () => {
    await localStorageArea.set('app_check_debug_token', appCheckDebugToken.trim());
    await localStorageArea.set('cloud_model_override', cloudModelOverride.trim());
    await localStorageArea.set('firebase_config_override', firebaseConfigOverride.trim());
    showSaveSuccess();
  };

  return (
    <div style={{ maxWidth: '680px', margin: '30px auto', padding: '0 20px', fontFamily: 'var(--font-family)', color: 'var(--text)' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ fontSize: '28px' }}>🛡</span>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>
          Privacy Router Settings
        </h1>
      </div>
      <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--muted)' }}>
        Configure on-device detection packs, routing behavior, cloud privacy consent, and testing parameters.
      </p>

      {/* Save banner */}
      {savedBanner && (
        <div
          style={{
            backgroundColor: 'var(--on-device-bg)',
            color: 'var(--on-device)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            border: '1px solid var(--on-device)',
          }}
        >
          ✓ Settings saved successfully.
        </div>
      )}

      {/* Tab Nav */}
      <nav style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        {(['general', 'detection', 'privacy', 'terms', 'advanced', 'about'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--accent)' : 'var(--muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'terms' ? 'Custom Terms' : tab}
          </button>
        ))}
      </nav>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Strict Mode</h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--muted)' }}>
              In addition to cards, account numbers, and personal identifiers, also mask currency amounts (e.g. $120.50, ₹5,000) as <code>[AMOUNT_n]</code>.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={strictMode}
                onChange={(e) => setStrictMode(e.target.checked)}
              />
              <span>Enable Strict Amount Masking</span>
            </label>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Default Routing Preference</h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--muted)' }}>
              Choose whether queries default to local on-device generation or hybrid cloud delegation (requires consent).
            </p>
            <select
              value={routingMode}
              onChange={(e) => setRoutingMode(e.target.value as UserRoutePreference)}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '13px',
              }}
            >
              <option value="auto">Auto (Hybrid: On-device for simple tasks, Cloud with consent for complex)</option>
              <option value="on-device-only">On-Device Only (Never calls cloud)</option>
              <option value="cloud-allowed">Cloud Allowed (Uses cloud model with sanitized input)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleSaveGeneral}
            style={{
              alignSelf: 'flex-start',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Save General Settings
          </button>
        </div>
      )}

      {/* Detection Tab */}
      {activeTab === 'detection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Locale Detector Packs</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--muted)' }}>
              Deterministic regex and checksum algorithms running on your device in &lt;1 ms.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                <input type="checkbox" checked disabled />
                <span><strong>GLOBAL Pack (Always On):</strong> Credit Cards (Luhn), IBAN (Mod-97), Emails, E.164 Phones, Account numbers, API Keys, Credentials.</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={packUs}
                  onChange={(e) => setPackUs(e.target.checked)}
                />
                <span><strong>US Pack:</strong> Social Security Numbers (SSN), ABA Transit Routing Numbers.</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={packIn}
                  onChange={(e) => setPackIn(e.target.checked)}
                />
                <span><strong>India (IN) Pack:</strong> PAN, Aadhaar (Verhoeff checksum), IFSC Codes, UPI IDs, Indian 10-digit mobile numbers.</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveDetection}
            style={{
              alignSelf: 'flex-start',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Save Detection Packs
          </button>
        </div>
      )}

      {/* Cloud & Privacy Tab */}
      {activeTab === 'privacy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Cloud Consent Status</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
              <span className={`badge ${consentGranted ? 'badge-on-device' : 'badge-warning'}`}>
                {consentGranted ? 'Active / Granted' : 'Not Granted'}
              </span>
              {consentDate && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Recorded on {consentDate}</span>}
            </div>

            {consentGranted && (
              <button
                type="button"
                onClick={handleRevokeConsent}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Revoke Cloud Consent
              </button>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Clear Session &amp; Vault Data</h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--muted)' }}>
              Immediately purges all current conversation history, local vault mappings, and memory states.
            </p>
            <button
              type="button"
              onClick={handleClearSession}
              style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear Session Data Now
            </button>
          </div>
        </div>
      )}

      {/* Custom Terms Tab */}
      {activeTab === 'terms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Always-Mask Custom Terms</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--muted)' }}>
              Add specific confidential keywords (e.g. secret project names, internal codenames) that should always be masked as <code>[CUSTOM_n]</code>. These terms stay strictly in your local extension storage and never sync.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Enter term (e.g. ProjectTitan)"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '13px',
                }}
              />
              <button
                type="button"
                onClick={handleAddTerm}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Add Term
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {customTerms.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>No custom terms added yet.</div>
              ) : (
                customTerms.map((term) => (
                  <span
                    key={term}
                    className="entity-chip"
                    style={{ padding: '4px 8px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>{term}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTerm(term)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '14px',
                        lineHeight: 1,
                      }}
                      title="Remove term"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Tester Tab per F-18 & doc 12 §7 */}
      {activeTab === 'advanced' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '12px',
              color: 'var(--text)',
            }}
          >
            <strong>For Judges &amp; Testers:</strong> These parameters allow you to test Privacy Router against your own Firebase project or supply an App Check debug token. They are not required for standard evaluation.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              App Check Debug Token
            </label>
            <input
              type="password"
              value={appCheckDebugToken}
              onChange={(e) => setAppCheckDebugToken(e.target.value)}
              placeholder="Paste Firebase App Check debug token"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Cloud Model Override
            </label>
            <input
              type="text"
              value={cloudModelOverride}
              onChange={(e) => setCloudModelOverride(e.target.value)}
              placeholder="e.g. gemini-3.5-flash-lite"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Firebase Web Config Override (JSON)
            </label>
            <textarea
              value={firebaseConfigOverride}
              onChange={(e) => setFirebaseConfigOverride(e.target.value)}
              placeholder='{"apiKey": "...", "projectId": "...", ...}'
              rows={4}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleSaveTesterConfig}
            style={{
              alignSelf: 'flex-start',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Save Tester Configuration
          </button>
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Privacy Router v0.1.0</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              Built for #BuildHybridAI 2026 Hackathon (Web / Chrome platform).
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div><strong>License:</strong> Apache License 2.0</div>
            <div>
              <strong>Architecture:</strong> Hybrid on-device detection (Gemini Nano) + deterministic safety gate + masked cloud delegation (Firebase AI Logic).
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              color: 'var(--muted)',
            }}
          >
            <strong>Honest Privacy Statement:</strong> Detection relies on combination of deterministic patterns and machine learning. No detector is guaranteed to find 100% of sensitive information. Always use the built-in Review Sheet to inspect masked text before approving transmission.
          </div>
        </div>
      )}
    </div>
  );
}
