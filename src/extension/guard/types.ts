/**
 * Guard Adapter Interfaces & Types
 * Refines docs/12-EXTENSION-SPEC.md §8 and ADR-021.
 */

export interface SiteAdapter {
  id: 'chatgpt' | 'claude' | 'gemini' | 'mock';
  name: string;
  matches(url: URL): boolean;
  findInput(): HTMLElement | null;
  getText(el: HTMLElement): string;
  setText(el: HTMLElement, text: string): void;
  findSubmitButton(): HTMLElement | null;
  onSubmitIntercepted(handler: (proceed: () => void) => void): () => void;
}
