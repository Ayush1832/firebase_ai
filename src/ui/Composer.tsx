import { useState, useRef, useEffect, KeyboardEvent } from 'react';

export interface ComposerProps {
  onSend: (text: string) => void;
  onTrySample: () => void;
  disabled?: boolean;
  initialText?: string;
}

export function Composer({ onSend, onTrySample, disabled, initialText = '' }: ComposerProps) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div
      style={{
        padding: '12px 14px',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask anything. Private financial details are masked before they leave your device…"
          rows={2}
          style={{
            flex: 1,
            resize: 'none',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border)',
            padding: '10px 12px',
            fontFamily: 'inherit',
            fontSize: '13px',
            lineHeight: '1.4',
            backgroundColor: 'var(--bg)',
            color: 'var(--text)',
            outline: 'none',
          }}
        />

        <button
          type="button"
          disabled={disabled || !text.trim()}
          onClick={handleSubmit}
          style={{
            background: disabled || !text.trim() ? 'var(--muted)' : 'var(--accent)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 'var(--radius-card)',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
            opacity: disabled || !text.trim() ? 0.6 : 1,
            flexShrink: 0,
          }}
          title="Send (initiates on-device privacy scan)"
          aria-label="Send"
        >
          ▶
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <button
          type="button"
          onClick={onTrySample}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: '12px',
            textDecoration: 'underline',
          }}
        >
          Try a sample finance prompt
        </button>

        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
          Enter sends · Shift+Enter newline
        </span>
      </div>
    </div>
  );
}
