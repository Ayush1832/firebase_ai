import { useState } from 'react';
import { AvailabilityState } from '../shared/types';

export interface OnboardingModalProps {
  isOpen: boolean;
  availability: AvailabilityState;
  onEnableModel?: () => void;
  onSelectSample: () => void;
  onComplete: () => void;
}

export function OnboardingModal({
  isOpen,
  availability,
  onEnableModel,
  onSelectSample,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div
        className="modal-content"
        style={{
          maxWidth: '460px',
          padding: '24px',
          gap: '16px',
        }}
      >
        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  width: '28px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: s <= step ? 'var(--accent)' : 'var(--border)',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
            Step {step} of 3
          </span>
        </div>

        {/* Step 1: Privacy Architecture */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 id="onboarding-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              What happens to your text
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px' }}>🔒</span>
                <div>
                  <strong>1. On-device detection:</strong> Your device scans for credit cards, accounts, names, and contact details before anything leaves your machine.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px' }}>🛡</span>
                <div>
                  <strong>2. Local masking:</strong> Sensitive values are replaced with typed tokens like <code>[CARD_1]</code>. Only masked text ever leaves your machine.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px' }}>✨</span>
                <div>
                  <strong>3. Local restoration:</strong> When the AI responds, your original values are re-inserted locally in your browser.
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontSize: '12px',
                color: 'var(--muted)',
              }}
            >
              <strong>Honest privacy:</strong> No detector is 100% guaranteed. Privacy Router gives you a visual Review Sheet before anything is transmitted.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
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
                Next: AI Setup →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Gemini Nano Activation */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 id="onboarding-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              Turn on on-device AI
            </h2>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
              Privacy Router uses Chrome&apos;s built-in Gemini Nano model to understand context and detect personal names, addresses, and organizations directly on your hardware.
            </p>

            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div><strong>Status:</strong> {availability.toUpperCase()}</div>
              <div><strong>Disk space requirement:</strong> Chrome requires ~22 GB free disk space for model weights.</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Skip for now (use rules only)
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {availability === 'downloadable' && onEnableModel && (
                  <button
                    type="button"
                    onClick={onEnableModel}
                    style={{
                      background: 'var(--on-device)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 14px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Download on-device model
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setStep(3)}
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
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Try it with synthetic data */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 id="onboarding-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              Try a sample prompt
            </h2>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
              See how Privacy Router masks sensitive financial details in real time before sending. All sample data is 100% synthetic.
            </p>

            <div
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap',
                color: 'var(--text)',
              }}
            >
              &ldquo;Hi, my name is Priya Sharma. Please draft a dispute letter for card 4242 4242 4242 4242 charged $120.50 at Apex Retail on Nov 3.&rdquo;
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  onSelectSample();
                  onComplete();
                }}
                style={{
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 14px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Insert sample prompt
              </button>

              <button
                type="button"
                onClick={onComplete}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 18px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Start chatting
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
