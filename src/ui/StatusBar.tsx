import { useState } from 'react';
import { AvailabilityState } from '../shared/types';
import { UserRoutePreference } from '../core/policy';

export interface StatusBarProps {
  availability: AvailabilityState;
  downloadProgress?: number;
  strictMode: boolean;
  routingMode: UserRoutePreference;
  onToggleStrictMode: () => void;
  onChangeRoutingMode: (mode: UserRoutePreference) => void;
  onEnableModel?: () => void;
  onOpenOptions: () => void;
}

export function StatusBar({
  availability,
  downloadProgress = 0,
  strictMode,
  routingMode,
  onToggleStrictMode,
  onChangeRoutingMode,
  onEnableModel,
  onOpenOptions,
}: StatusBarProps) {
  const [showWhyModal, setShowWhyModal] = useState(false);

  return (
    <>
      <header
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Top row: Title + Model State Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '14px' }}>
            <span role="img" aria-label="Shield">🛡</span>
            <span>Privacy Router</span>
          </div>

          <div>
            {availability === 'ready' && (
              <span className="badge badge-on-device" title="Gemini Nano is active and ready on your device">
                ● On-device ready
              </span>
            )}

            {availability === 'downloadable' && (
              <button
                type="button"
                onClick={onEnableModel}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-chip)',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Click to initialize and download Gemini Nano"
              >
                ○ Enable on-device AI
              </button>
            )}

            {availability === 'downloading' && (
              <span className="badge badge-rules" style={{ color: 'var(--accent)' }} title="Downloading model weights">
                ◔ Downloading {downloadProgress > 0 ? `${downloadProgress}%` : ''}
              </span>
            )}

            {availability === 'unavailable' && (
              <button
                type="button"
                onClick={() => setShowWhyModal(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--warning)',
                  color: 'var(--warning)',
                  borderRadius: 'var(--radius-chip)',
                  padding: '2px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="On-device AI unavailable. Running in rules-only mode. Click to see why."
              >
                <span>⚠ Rules-only</span>
                <span style={{ textDecoration: 'underline', fontSize: '10px' }}>Why?</span>
              </button>
            )}

            {availability === 'degraded' && (
              <span className="badge badge-warning" title="Model initialization experienced an issue">
                ⚠ Degraded
              </span>
            )}
          </div>
        </div>

        {/* Bottom row: Controls & Config */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onToggleStrictMode}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: strictMode ? 'var(--accent)' : 'var(--muted)',
                fontWeight: strictMode ? 600 : 400,
                cursor: 'pointer',
                fontSize: '12px',
              }}
              title="Strict mode also detects and masks dollar amounts"
            >
              Strict: {strictMode ? 'ON' : 'off'}
            </button>

            <span style={{ color: 'var(--border)' }}>|</span>

            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)' }}>
              <span>Route:</span>
              <select
                value={routingMode}
                onChange={(e) => onChangeRoutingMode(e.target.value as UserRoutePreference)}
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  padding: '1px 4px',
                  cursor: 'pointer',
                }}
              >
                <option value="auto">Auto</option>
                <option value="on-device-only">On-device only</option>
                <option value="cloud-allowed">Cloud allowed</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={onOpenOptions}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Open Settings"
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Why is on-device AI unavailable? Modal per doc 11 §4.9 */}
      {showWhyModal && (
        <div className="modal-overlay" onClick={() => setShowWhyModal(false)} role="dialog" aria-modal="true">
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '20px', gap: '14px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Why is on-device AI unavailable?</h3>
              <button
                type="button"
                onClick={() => setShowWhyModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
              Privacy Router protects your sensitive data with deterministic patterns (cards, accounts, phones, emails, IDs). To also detect names, organizations, and addresses, Gemini Nano is required:
            </p>

            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Browser:</strong> Google Chrome Desktop version 139 or higher.
              </li>
              <li>
                <strong>Disk space:</strong> At least 22 GB free disk space on the primary OS volume.
              </li>
              <li>
                <strong>Hardware:</strong> GPU with &gt; 4 GB VRAM or CPU with 16 GB RAM and 4+ cores.
              </li>
              <li>
                <strong>Chrome flags:</strong> Enable <code>#prompt-api-for-gemini-nano-multimodal-input</code> or Gemma 4 under <code>chrome://flags</code>.
              </li>
              <li>
                <strong>Components:</strong> Verify model download status at <code>chrome://on-device-internals</code>.
              </li>
            </ul>

            <div style={{ backgroundColor: 'var(--surface)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '12px', border: '1px solid var(--border)' }}>
              <strong>Safe Fallback:</strong> While on-device AI is inactive, our comprehensive deterministic rules pack protects all financial accounts, cards, tax IDs, contact information, and secrets.
            </div>

            <button
              type="button"
              onClick={() => setShowWhyModal(false)}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 16px',
                fontWeight: 600,
                alignSelf: 'flex-end',
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
