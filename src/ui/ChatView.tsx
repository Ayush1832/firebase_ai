import { useRef, useEffect, ReactNode } from 'react';
import { PipelineProgressEvent } from '../ai/pipeline';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string; // Restored display text
  rawContent?: string;
  route?: 'ON_DEVICE' | 'CLOUD';
  maskedCount?: number;
  ledgerEntryId?: string;
  restoredTokens?: { token: string; value: string }[];
}

export interface ChatViewProps {
  messages: ChatMessage[];
  isAnalyzing: boolean;
  analyzingProgress: PipelineProgressEvent | null;
  onCancelAnalyzing: () => void;
  onOpenLedger: (ledgerEntryId: string) => void;
  onTrySample: () => void;
}

export function ChatView({
  messages,
  isAnalyzing,
  analyzingProgress,
  onCancelAnalyzing,
  onOpenLedger,
  onTrySample,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAnalyzing, analyzingProgress]);

  // Render assistant content with restored tokens underlined
  const renderAssistantContent = (msg: ChatMessage) => {
    if (!msg.restoredTokens || msg.restoredTokens.length === 0) {
      return msg.content;
    }

    // Replace restored token occurrences with annotated spans
    let text = msg.content;
    const parts: ReactNode[] = [];
    let keyIdx = 0;

    // Find and highlight restored values
    msg.restoredTokens.forEach(({ token, value }) => {
      const idx = text.indexOf(value);
      if (idx !== -1) {
        parts.push(text.slice(0, idx));
        parts.push(
          <span
            key={`restored-${keyIdx++}`}
            style={{
              borderBottom: '2px dotted var(--on-device)',
              fontWeight: 500,
              cursor: 'help',
            }}
            title={`Restored from ${token} locally on your device`}
          >
            {value}
          </span>
        );
        text = text.slice(idx + value.length);
      }
    });
    parts.push(text);

    return parts;
  };

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Empty State */}
      {messages.length === 0 && !isAnalyzing && (
        <div
          style={{
            margin: 'auto 0',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '24px 16px',
          }}
        >
          <div style={{ fontSize: '36px' }}>🛡</div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            Private Hybrid Finance Chat
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', maxWidth: '300px', lineHeight: '1.5' }}>
            Personal financial details are detected and masked on your device before text reaches any cloud model.
          </p>

          <button
            type="button"
            onClick={onTrySample}
            style={{
              marginTop: '8px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-chip)',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--accent)',
              cursor: 'pointer',
            }}
          >
            Try a sample dispute prompt
          </button>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';

        return (
          <div
            key={msg.id || index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
              gap: '4px',
              width: '100%',
            }}
          >
            {/* Sender & Badge Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
              <span>{isUser ? 'You' : 'Assistant'}</span>
              {!isUser && msg.route && (
                <span className={`badge ${msg.route === 'ON_DEVICE' ? 'badge-on-device' : 'badge-cloud'}`}>
                  {msg.route}
                </span>
              )}
            </div>

            {/* Bubble */}
            <div
              style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                backgroundColor: isUser ? 'var(--accent-subtle)' : 'var(--surface)',
                color: 'var(--text)',
                fontSize: '13px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                border: '1px solid var(--border)',
              }}
            >
              {isUser ? msg.content : renderAssistantContent(msg)}
            </div>

            {/* Ledger Chip / Masked Items indicator */}
            {msg.ledgerEntryId && (
              <button
                type="button"
                onClick={() => onOpenLedger(msg.ledgerEntryId!)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-chip)',
                }}
                title="View local audit ledger for this message"
              >
                <span>🛡</span>
                {isUser && typeof msg.maskedCount === 'number'
                  ? `${msg.maskedCount} masked`
                  : 'Ledger'}
              </button>
            )}
          </div>
        );
      })}

      {/* Analyzing Progress State per doc 11 §4.3 */}
      {isAnalyzing && (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '12px',
          }}
        >
          <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Analyzing on your device…</span>
            <button
              type="button"
              onClick={onCancelAnalyzing}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                cursor: 'pointer',
                fontSize: '11px',
                padding: 0,
              }}
            >
              Cancel
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--on-device)' }}>✓</span>
              <span>Rules layer checked</span>
            </div>

            {analyzingProgress?.stage === 'nano' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent)' }}>◔</span>
                <span>
                  {analyzingProgress.message || 'On-device AI scanning for names and addresses…'}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '8px',
              fontSize: '11px',
              color: 'var(--on-device)',
              fontWeight: 500,
            }}
          >
            🔒 Nothing has left your device.
          </div>
        </div>
      )}
    </div>
  );
}
