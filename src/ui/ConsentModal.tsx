import { useState } from 'react';

export interface ConsentModalProps {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export function ConsentModal({ isOpen, onConsent, onDecline }: ConsentModalProps) {
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [isGeoConfirmed, setIsGeoConfirmed] = useState(false);
  const [isTermsConfirmed, setIsTermsConfirmed] = useState(false);

  if (!isOpen) return null;

  const canConsent = isAgeConfirmed && isGeoConfirmed && isTermsConfirmed;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="modal-content" style={{ padding: '24px', gap: '16px' }}>
        <h2 id="consent-title" style={{ margin: 0, fontSize: '18px', color: 'var(--text)' }}>
          Allow cloud answers?
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text)', lineHeight: '1.5' }}>
          <p style={{ margin: 0 }}>
            Privacy Router first masks private financial details on your device. If you allow it, the <strong>masked</strong> text is sent to Google&apos;s Gemini through Firebase AI Logic to write the answer.
          </p>

          <div
            style={{
              backgroundColor: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              color: 'var(--text)',
              fontSize: '12px',
            }}
          >
            <strong>Free-tier notice:</strong> On the free tier, Google may use content sent to its API to improve its products, and human reviewers may read it. Masking significantly reduces what they see, but no detector is 100% guaranteed. Never share data you wouldn&apos;t want anyone to read.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isAgeConfirmed}
                onChange={(e) => setIsAgeConfirmed(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>I am 18 years of age or older.</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isGeoConfirmed}
                onChange={(e) => setIsGeoConfirmed(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>I am not accessing this service from the European Economic Area (EEA), Switzerland, or the United Kingdom.</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isTermsConfirmed}
                onChange={(e) => setIsTermsConfirmed(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>I understand that only masked text will leave my device, and I agree to these terms.</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <button
            type="button"
            onClick={onDecline}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Use on-device only
          </button>

          <button
            type="button"
            disabled={!canConsent}
            onClick={onConsent}
            style={{
              background: canConsent ? 'var(--accent)' : 'var(--muted)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: canConsent ? 'pointer' : 'not-allowed',
              opacity: canConsent ? 1 : 0.6,
            }}
          >
            Allow cloud answers
          </button>
        </div>
      </div>
    </div>
  );
}
