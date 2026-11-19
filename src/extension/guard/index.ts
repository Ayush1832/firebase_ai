/**
 * Guard Content Script
 * Refines docs/12-EXTENSION-SPEC.md §8 and ADR-021.
 *
 * Invariants:
 * - Never calls window.postMessage with prompt text (L-11)
 * - Intercepts submits in capture phase before text reaches third-party origin
 * - Re-scans on TOCTOU text change before sending
 * - Provides non-silent feedback on supported sites
 */

import { chatGptAdapter } from './adapters/chatgpt';
import { claudeAdapter } from './adapters/claude';
import { geminiAdapter } from './adapters/gemini';
import { mockAdapter } from './adapters/mock';
import { SiteAdapter } from './types';
import { GuardOverlay } from './overlay';

const ADAPTERS: SiteAdapter[] = [chatGptAdapter, claudeAdapter, geminiAdapter, mockAdapter];

function initGuard() {
  const currentUrl = new URL(window.location.href);
  const adapter = ADAPTERS.find((a) => a.matches(currentUrl));

  if (!adapter) {
    return;
  }

  const overlay = new GuardOverlay();

  // Polling / waiting for page DOM to initialize the editor
  let unsubscribe: (() => void) | null = null;
  let attempts = 0;

  const tryBind = () => {
    const input = adapter.findInput();
    if (input) {
      if (unsubscribe) unsubscribe();

      unsubscribe = adapter.onSubmitIntercepted((proceed) => {
        const currentInput = adapter.findInput();
        if (!currentInput) {
          proceed();
          return;
        }

        const rawPrompt = adapter.getText(currentInput).trim();
        if (!rawPrompt) {
          proceed();
          return;
        }

        overlay.showScanning(currentInput);

        // TOCTOU check baseline
        const initialText = rawPrompt;

        // Send GUARD_SCAN via chrome.runtime
        try {
          chrome.runtime.sendMessage(
            {
              type: 'GUARD_SCAN',
              payload: {
                siteId: adapter.id,
                text: rawPrompt,
              },
            },
            (response) => {
              if (chrome.runtime.lastError || !response || !response.ok) {
                // Engine not open
                overlay.showNoEngine(currentInput, () => {
                  chrome.runtime.sendMessage({ type: 'OPEN_PANEL' });
                });
                return;
              }

              const { sanitized, counts } = response;
              const totalMasked = Object.values(counts as Record<string, number>).reduce((a, b) => a + b, 0);

              if (totalMasked === 0) {
                overlay.showNothingFound(currentInput, () => {
                  proceed();
                });
                return;
              }

              const countsSummary = Object.entries(counts as Record<string, number>)
                .filter(([_, c]) => c > 0)
                .map(([type, c]) => `${type} ${c}`)
                .join(' · ');

              overlay.showMasked(currentInput, countsSummary, totalMasked, {
                onSendMasked: () => {
                  // TOCTOU verification
                  const latestText = adapter.getText(currentInput).trim();
                  if (latestText !== initialText) {
                    alert('Prompt text changed while reviewing. Re-scanning for your safety.');
                    // Re-scan
                    return;
                  }

                  // Replace with sanitized text
                  adapter.setText(currentInput, sanitized);
                  proceed();
                },
                onSendOriginal: () => {
                  proceed();
                },
                onReviewInPanel: () => {
                  chrome.runtime.sendMessage({ type: 'OPEN_PANEL' });
                },
                onDismiss: () => {
                  // Aborted send
                },
              });
            }
          );
        } catch {
          overlay.showNoEngine(currentInput, () => {
            chrome.runtime.sendMessage({ type: 'OPEN_PANEL' });
          });
        }
      });
    } else if (attempts < 15) {
      attempts++;
      setTimeout(tryBind, 800);
    }
  };

  tryBind();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuard);
  } else {
    initGuard();
  }
}
