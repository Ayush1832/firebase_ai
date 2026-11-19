import { SiteAdapter } from '../types';
import { getEditorValue, setEditorValue } from '../editor';

export const mockAdapter: SiteAdapter = {
  id: 'mock',
  name: 'Mock AI Chat (Demo & Testing)',

  matches(url: URL): boolean {
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.pathname.includes('mock-guard')
    );
  },

  findInput(): HTMLElement | null {
    return (
      document.querySelector('#mock-prompt-input') ||
      document.querySelector('textarea#prompt') ||
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
      document.querySelector('#mock-send-btn') ||
      document.querySelector('button#submit') ||
      document.querySelector('button[type="submit"]')
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
