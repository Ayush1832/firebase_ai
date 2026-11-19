// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { chatGptAdapter } from '../src/extension/guard/adapters/chatgpt';
import { claudeAdapter } from '../src/extension/guard/adapters/claude';
import { geminiAdapter } from '../src/extension/guard/adapters/gemini';
import { mockAdapter } from '../src/extension/guard/adapters/mock';
import { setEditorValue, getEditorValue } from '../src/extension/guard/editor';

describe('Phase 3: Guard Framework & Site Adapters', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('URL Host Matching', () => {
    it('chatgpt adapter matches chatgpt.com and chat.openai.com', () => {
      expect(chatGptAdapter.matches(new URL('https://chatgpt.com/c/123'))).toBe(true);
      expect(chatGptAdapter.matches(new URL('https://chat.openai.com/'))).toBe(true);
      expect(chatGptAdapter.matches(new URL('https://claude.ai'))).toBe(false);
    });

    it('claude adapter matches claude.ai', () => {
      expect(claudeAdapter.matches(new URL('https://claude.ai/chat/abc'))).toBe(true);
      expect(claudeAdapter.matches(new URL('https://chatgpt.com'))).toBe(false);
    });

    it('gemini adapter matches gemini.google.com', () => {
      expect(geminiAdapter.matches(new URL('https://gemini.google.com/app'))).toBe(true);
      expect(geminiAdapter.matches(new URL('https://claude.ai'))).toBe(false);
    });

    it('mock adapter matches localhost and 127.0.0.1 (ADR-021)', () => {
      expect(mockAdapter.matches(new URL('http://localhost:3000/tests/mock-guard.html'))).toBe(true);
      expect(mockAdapter.matches(new URL('http://127.0.0.1:8080/'))).toBe(true);
      expect(mockAdapter.matches(new URL('https://google.com'))).toBe(false);
    });
  });

  describe('Editor Value Reading and Writing', () => {
    it('reads and writes HTMLTextAreaElement with synthetic input/change events', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      let inputFired = false;
      let changeFired = false;
      textarea.addEventListener('input', () => { inputFired = true; });
      textarea.addEventListener('change', () => { changeFired = true; });

      setEditorValue(textarea, 'Masked text [CARD_1]');

      expect(getEditorValue(textarea)).toBe('Masked text [CARD_1]');
      expect(inputFired).toBe(true);
      expect(changeFired).toBe(true);
    });

    it('reads and writes ContentEditable element', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      document.body.appendChild(div);

      setEditorValue(div, 'Hello [PERSON_1]');

      expect(getEditorValue(div)).toBe('Hello [PERSON_1]');
    });
  });

  describe('Mock Adapter DOM integration', () => {
    it('finds mock input and submit controls on mock prompt page', () => {
      document.body.innerHTML = `
        <textarea id="mock-prompt-input"></textarea>
        <button id="mock-send-btn" type="button">Send</button>
      `;

      const input = mockAdapter.findInput();
      const btn = mockAdapter.findSubmitButton();

      expect(input).not.toBeNull();
      expect(btn).not.toBeNull();

      if (input) {
        mockAdapter.setText(input, 'Dispute [CARD_1]');
        expect(mockAdapter.getText(input)).toBe('Dispute [CARD_1]');
      }
    });

    it('intercepts submit click in capture phase', () => {
      document.body.innerHTML = `
        <textarea id="mock-prompt-input">Confidential query</textarea>
        <button id="mock-send-btn" type="button">Send</button>
      `;

      let intercepted = false;
      const unsubscribe = mockAdapter.onSubmitIntercepted((proceed) => {
        intercepted = true;
        proceed();
      });

      const btn = mockAdapter.findSubmitButton()!;
      btn.click();

      expect(intercepted).toBe(true);
      unsubscribe();
    });
  });
});
