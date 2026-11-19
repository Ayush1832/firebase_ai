import { useState } from 'react';
import { LedgerEntry } from '../shared/types';

export interface LedgerDrawerProps {
  isOpen: boolean;
  entry: LedgerEntry | null;
  messageIndex?: number;
  onClose: () => void;
}

export function LedgerDrawer({ isOpen, entry, messageIndex = 1, onClose }: LedgerDrawerProps) {
  const [showSanitized, setShowSanitized] = useState(false);

  if (!isOpen || !entry) return null;

  const rawLeftDevice = entry.rawLeftDevice;
  const route = entry.routing?.route || 'ON_DEVICE';

  // Format masked counts string: e.g. "Person 2 · Card 1 · Email 1"
  const countsSummary = Object.entries(entry.counts)
    .filter(([_, count]) => typeof count === 'number' && count > 0)
    .map(([type, count]) => `${type} ${count}`)
    .join(' · ');

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ledger-title">
      <div
        className="modal-content"
        style={{
          maxWidth: '460px',
          padding: '20px',
          gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 id="ledger-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              Ledger · Message {messageIndex}
            </h2>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              Timestamp: {new Date(entry.ts).toLocaleTimeString()}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--muted)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Steps Audit Checklist */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: 'var(--surface)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>1. Find sensitive items</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`badge ${entry.mode === 'full' ? 'badge-on-device' : 'badge-rules'}`}>
                {entry.mode === 'full' ? 'ON-DEVICE (AI)' : 'RULES'}
              </span>
              <span style={{ color: 'var(--on-device)' }}>✓</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>2. Pattern checks</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-rules">RULES</span>
              <span style={{ color: 'var(--on-device)' }}>✓</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>3. Safety check</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-rules">RULES</span>
              <span style={{ color: 'var(--on-device)' }}>✓</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>4. Answer generation</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`badge ${route === 'ON_DEVICE' ? 'badge-on-device' : 'badge-cloud'}`}>
                {route === 'ON_DEVICE' ? 'ON-DEVICE' : 'CLOUD'}
              </span>
              <span style={{ color: 'var(--on-device)' }}>✓</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>5. Restore values locally</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-on-device">ON-DEVICE</span>
              <span style={{ color: 'var(--on-device)' }}>✓</span>
            </div>
          </div>
        </div>

        {/* Audit Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
          <div>
            <span style={{ color: 'var(--muted)' }}>Masked entities: </span>
            <strong>{countsSummary || 'None'}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--muted)' }}>Raw text left your device:</span>
            {rawLeftDevice ? (
              <span className="badge badge-danger">YES (User Override)</span>
            ) : (
              <span className="badge badge-on-device">NO</span>
            )}
          </div>

          <div>
            <span style={{ color: 'var(--muted)' }}>Safety gate result: </span>
            <span style={{ fontWeight: 600, color: 'var(--on-device)' }}>
              PASSED
            </span>
          </div>
        </div>

        {/* View Sanitized Text Accordion */}
        {entry.sanitizedPreview && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
            <button
              type="button"
              onClick={() => setShowSanitized(!showSanitized)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{showSanitized ? 'Hide what the model received ▴' : 'What the cloud/model received [View sanitized ▾]'}</span>
            </button>

            {showSanitized && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '10px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                {entry.sanitizedPreview}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <button
            type="button"
            onClick={() => {
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entry, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', dataStr);
              downloadAnchor.setAttribute('download', `ledger-entry-${entry.id}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '12px',
              color: 'var(--muted)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Download audit entry (JSON)
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
