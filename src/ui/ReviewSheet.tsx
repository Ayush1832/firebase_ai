import { useState, ReactNode } from 'react';
import { GateResult, RawText, RoutingDecision, SanitizedText, Span } from '../shared/types';

export interface ReviewSheetProps {
  isOpen: boolean;
  rawText: RawText;
  sanitizedText?: SanitizedText;
  initialSpans: Span[];
  mode: 'full' | 'rules-only';
  degradedChunks: number[];
  gateResult: GateResult;
  routingDecision: RoutingDecision;
  onSend: (finalSpans: Span[]) => void;
  onCancel: () => void;
  onRequestConsent: () => void;
}

export function ReviewSheet({
  isOpen,
  rawText,
  sanitizedText,
  initialSpans,
  mode,
  degradedChunks,
  gateResult,
  routingDecision,
  onSend,
  onCancel,
  onRequestConsent,
}: ReviewSheetProps) {
  const [spans, setSpans] = useState<Span[]>(initialSpans);
  const [unmaskedIndices, setUnmaskedIndices] = useState<Set<number>>(new Set());
  const [reviewedCheckbox, setReviewedCheckbox] = useState(false);
  const [previewSanitized, setPreviewSanitized] = useState(false);
  const [confirmUnmaskSpan, setConfirmUnmaskSpan] = useState<Span | null>(null);
  const [confirmUnmaskIdx, setConfirmUnmaskIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const isRulesOnly = mode === 'rules-only';
  const hasDegradedChunks = degradedChunks.length > 0;
  const activeSpans = spans.filter((_, idx) => !unmaskedIndices.has(idx));

  const getSpanText = (span: Span): string => {
    return span.originalText || rawText.slice(span.start, span.end);
  };

  const handleToggleMask = (span: Span, index: number) => {
    if (unmaskedIndices.has(index)) {
      // Re-mask
      const next = new Set(unmaskedIndices);
      next.delete(index);
      setUnmaskedIndices(next);
    } else {
      // High confidence check per doc 11 §4.4
      if (
        span.confidence === 'high' &&
        ['CARD_NUMBER', 'IBAN', 'ACCOUNT_NUMBER', 'CREDENTIAL', 'API_KEY'].includes(span.type)
      ) {
        setConfirmUnmaskSpan(span);
        setConfirmUnmaskIdx(index);
      } else {
        const next = new Set(unmaskedIndices);
        next.add(index);
        setUnmaskedIndices(next);
      }
    }
  };

  const handleConfirmUnmask = () => {
    if (confirmUnmaskIdx !== null) {
      const next = new Set(unmaskedIndices);
      next.add(confirmUnmaskIdx);
      setUnmaskedIndices(next);
    }
    setConfirmUnmaskSpan(null);
    setConfirmUnmaskIdx(null);
  };

  // Add custom mask from user selection
  const handleAddCustomMask = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const startIdx = rawText.indexOf(selectedText);
    if (startIdx >= 0) {
      const endIdx = startIdx + selectedText.length;
      // Add custom span
      const newSpan: Span = {
        start: startIdx,
        end: endIdx,
        type: 'CUSTOM',
        confidence: 'high',
        source: 'user',
        reason: 'User manually masked',
        originalText: selectedText,
      };
      setSpans((prev) => [...prev, newSpan]);
      selection.removeAllRanges();
    }
  };

  // Validation before sending
  const isGateBlocked = gateResult.status === 'blocked';
  const isReviewRequirementMet = !isRulesOnly || reviewedCheckbox;
  const canSend = !isGateBlocked && isReviewRequirementMet;

  // Build annotated text for highlight preview
  const renderAnnotatedText = () => {
    if (previewSanitized && sanitizedText) {
      return (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            padding: '12px',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}
        >
          {sanitizedText}
        </div>
      );
    }

    // Sort spans by start offset
    const sorted = spans
      .map((s, idx) => ({ span: s, originalIdx: idx }))
      .sort((a, b) => a.span.start - b.span.start);

    const segments: ReactNode[] = [];
    let lastOffset = 0;

    sorted.forEach(({ span, originalIdx }) => {
      if (span.start > lastOffset) {
        segments.push(rawText.slice(lastOffset, span.start));
      }

      const isUnmasked = unmaskedIndices.has(originalIdx);
      const spanText = getSpanText(span);

      segments.push(
        <button
          key={`span-${originalIdx}-${span.start}`}
          type="button"
          onClick={() => handleToggleMask(span, originalIdx)}
          className={`entity-chip ${isUnmasked ? 'unmasked' : ''}`}
          title={
            isUnmasked
              ? `Click to re-mask as ${span.type}`
              : `Click to unmask ${span.type} (${span.confidence} confidence)`
          }
          style={{
            color: isUnmasked ? 'var(--muted)' : 'inherit',
          }}
        >
          <span>{spanText}</span>
          <span className="entity-chip-label">· {span.type}</span>
        </button>
      );

      lastOffset = Math.max(lastOffset, span.end);
    });

    if (lastOffset < rawText.length) {
      segments.push(rawText.slice(lastOffset));
    }

    return (
      <div
        onMouseUp={handleAddCustomMask}
        style={{
          fontFamily: 'inherit',
          fontSize: '13px',
          lineHeight: '1.8',
          whiteSpace: 'pre-wrap',
          padding: '12px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          maxHeight: '260px',
          overflowY: 'auto',
          userSelect: 'text',
        }}
      >
        {segments}
      </div>
    );
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div
        className="modal-content"
        style={{
          maxWidth: '520px',
          padding: '20px',
          gap: '14px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 id="review-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              Review before sending
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {activeSpans.length} item{activeSpans.length === 1 ? '' : 's'} will be masked
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'full' ? (
              <span className="badge badge-on-device" title="Rules and Gemini Nano both ran">
                ✓ Full scan
              </span>
            ) : (
              <span className="badge badge-warning" title="Pattern checks only">
                ⚠ Rules only
              </span>
            )}
          </div>
        </div>

        {/* Mode Banners per doc 11 §4.4 */}
        {isRulesOnly && (
          <div
            style={{
              backgroundColor: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '12px',
              color: 'var(--text)',
            }}
          >
            <strong>Reduced confidence:</strong> On-device AI isn&apos;t available, so only pattern checks ran. Names and addresses may be missed. Please read through before sending.
          </div>
        )}

        {hasDegradedChunks && !isRulesOnly && (
          <div
            style={{
              backgroundColor: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '12px',
              color: 'var(--text)',
            }}
          >
            Part of your text ({degradedChunks.length} chunk{degradedChunks.length === 1 ? '' : 's'}) was checked with patterns only due to length limits.
          </div>
        )}

        {isGateBlocked && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '12px',
              color: 'var(--danger)',
              fontWeight: 600,
            }}
          >
            Blocked: {gateResult.leftovers.length} sensitive item(s) remain unmasked.
          </div>
        )}

        {/* View Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: 'var(--muted)' }}>
            Tip: Click a chip to unmask. Select any text to mask it.
          </span>
          <button
            type="button"
            onClick={() => setPreviewSanitized(!previewSanitized)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              padding: 0,
            }}
          >
            {previewSanitized ? 'Show highlights view' : 'Show what AI will see ▾'}
          </button>
        </div>

        {/* Text Annotation Canvas */}
        {renderAnnotatedText()}

        {/* Reduced confidence review checkbox (ADR-002) */}
        {isRulesOnly && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={reviewedCheckbox}
              onChange={(e) => setReviewedCheckbox(e.target.checked)}
            />
            <span>I have reviewed this text and confirmed no private names/addresses are missed.</span>
          </label>
        )}

        {/* Route info */}
        <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            Route: <strong>{routingDecision.route === 'ON_DEVICE' ? 'On-device' : 'Cloud (Gemini)'}</strong>
            {' · '}
            <span>{routingDecision.reason}</span>
          </div>

          {routingDecision.route === 'ON_DEVICE' && (
            <button
              type="button"
              onClick={onRequestConsent}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '11px',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Allow cloud answers…
            </button>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Back to edit
          </button>

          <button
            type="button"
            disabled={!canSend}
            onClick={() => onSend(activeSpans)}
            style={{
              background: canSend ? 'var(--accent)' : 'var(--muted)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: canSend ? 'pointer' : 'not-allowed',
              opacity: canSend ? 1 : 0.6,
            }}
          >
            Send sanitized ▶
          </button>
        </div>
      </div>

      {/* Confirmation modal for high-confidence unmask */}
      {confirmUnmaskSpan && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ padding: '20px', maxWidth: '380px', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--danger)' }}>
              Confirm unmasking sensitive item
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)' }}>
              This looks like a valid <strong>{confirmUnmaskSpan.type}</strong> ({getSpanText(confirmUnmaskSpan)}). Show it to the AI anyway?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setConfirmUnmaskSpan(null);
                  setConfirmUnmaskIdx(null);
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Keep masked
              </button>
              <button
                type="button"
                onClick={handleConfirmUnmask}
                style={{
                  background: 'var(--danger)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Unmask anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
