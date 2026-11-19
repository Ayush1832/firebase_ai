import { SiteAdapter } from '../types';
import { getEditorValue, setEditorValue } from '../editor';

export const geminiAdapter: SiteAdapter = {
  id: 'gemini',
  name: 'Gemini',

  matches(url: URL): boolean {
    return url.hostname.includes('gemini.google.com');
  },

  findInput(): HTMLElement | null {
    return (
      document.querySelector('div.ql-editor[contenteditable="true"]') ||
      document.querySelector('rich-textarea div[contenteditable="true"]') ||
      document.querySelector('textarea')
    );
  },

  getText(el: HTMLElement): string {
    return getEditorValue(el);
  },

  setText(el: HTMLElement, text: string): void {
    setEditorValue(el, text);
  },

  findSubmitButton(): HTMLElement | null {
    return (
      document.querySelector('button.send-button') ||
      document.querySelector('button[aria-label="Send message"]') ||
      document.querySelector('button[aria-label="Submit"]')
    );
  },

  onSubmitIntercepted(handler: (proceed: () => void) => void): () => void {
    let isBypassing = false;

    const handleKeydown = (e: KeyboardEvent) => {
      if (isBypassing) return;
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        const input = this.findInput();
        if (input && (input === e.target || input.contains(e.target as Node))) {
          e.preventDefault();
          e.stopImmediatePropagation();
          handler(() => {
            isBypassing = true;
            const btn = this.findSubmitButton();
            if (btn) btn.click();
            isBypassing = false;
          });
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (isBypassing) return;
      const btn = this.findSubmitButton();
      if (btn && (btn === e.target || btn.contains(e.target as Node))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handler(() => {
          isBypassing = true;
          btn.click();
          isBypassing = false;
        });
      }
    };

    window.addEventListener('keydown', handleKeydown, true);
    window.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('keydown', handleKeydown, true);
      window.removeEventListener('click', handleClick, true);
    };
  },
};
