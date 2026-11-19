/**
 * Guard Overlay UI (Pure DOM, Isolated, Non-Invasive)
 * Refines docs/11-UX-SPEC.md §4.8.
 */

export interface GuardOverlayOptions {
  onSendMasked: () => void;
  onSendOriginal: () => void;
  onReviewInPanel: () => void;
  onDismiss: () => void;
}

export class GuardOverlay {
  private element: HTMLElement | null = null;

  showScanning(anchor: HTMLElement): void {
    this.createOrUpdate(anchor, (container) => {
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px;">
            <span>🛡</span> <span>Privacy Router Guard</span>
          </div>
        </div>
        <div style="font-size: 12px; color: #5B6776; display: flex; align-items: center; gap: 6px;">
          <span>◔</span> <span>Analyzing prompt on your device…</span>
        </div>
      `;
    });
  }

  showMasked(
    anchor: HTMLElement,
    countsSummary: string,
    totalItems: number,
    options: GuardOverlayOptions
  ): void {
    this.createOrUpdate(anchor, (container) => {
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px;">
            <span>🛡</span> <span>Privacy Router Guard</span>
          </div>
          <span style="font-size: 11px; padding: 1px 6px; border-radius: 999px; background: #E6F4EA; color: #0F7B53; font-weight: 600;">
            ✓ Safe to Send
          </span>
        </div>
        <div style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">
          ${totalItems} item${totalItems === 1 ? '' : 's'} masked in your prompt
        </div>
        <div style="font-size: 11px; color: #5B6776; margin-bottom: 12px; font-family: monospace;">
          ${countsSummary}
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
          <button id="pr-guard-review-btn" type="button" style="background: transparent; border: 1px solid #D0D7DE; border-radius: 4px; padding: 6px 10px; font-size: 12px; cursor: pointer;">
            Review
          </button>
          <button id="pr-guard-send-masked-btn" type="button" style="background: #0B57D0; color: #fff; border: none; border-radius: 4px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">
            Send masked ▶
          </button>
        </div>
        <div style="margin-top: 8px; text-align: right;">
          <button id="pr-guard-send-orig-btn" type="button" style="background: none; border: none; font-size: 11px; color: #B3261E; text-decoration: underline; cursor: pointer; padding: 0;">
            Send original (not advised)
          </button>
        </div>
      `;

      container.querySelector('#pr-guard-send-masked-btn')?.addEventListener('click', () => {
        this.dismiss();
        options.onSendMasked();
      });

      container.querySelector('#pr-guard-review-btn')?.addEventListener('click', () => {
        this.dismiss();
        options.onReviewInPanel();
      });

      container.querySelector('#pr-guard-send-orig-btn')?.addEventListener('click', () => {
        if (confirm('This will transmit your RAW unmasked prompt to the cloud AI service. Are you sure?')) {
          this.dismiss();
          options.onSendOriginal();
        }
      });
    });
  }

  showNothingFound(anchor: HTMLElement, onProceed: () => void): void {
    this.createOrUpdate(anchor, (container) => {
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px;">
            <span>🛡</span> <span>Privacy Router Guard</span>
          </div>
        </div>
        <div style="font-size: 12px; color: #5B6776; margin-bottom: 12px;">
          No sensitive financial items found. Please check for names and private identifiers yourself.
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="pr-guard-cancel-btn" type="button" style="background: transparent; border: 1px solid #D0D7DE; border-radius: 4px; padding: 6px 10px; font-size: 12px; cursor: pointer;">
            Cancel
          </button>
          <button id="pr-guard-send-proceed-btn" type="button" style="background: #0B57D0; color: #fff; border: none; border-radius: 4px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">
            Send ▶
          </button>
        </div>
      `;

      container.querySelector('#pr-guard-cancel-btn')?.addEventListener('click', () => this.dismiss());
      container.querySelector('#pr-guard-send-proceed-btn')?.addEventListener('click', () => {
        this.dismiss();
        onProceed();
      });
    });
  }

  showNoEngine(anchor: HTMLElement, onOpenPanel: () => void): void {
    this.createOrUpdate(anchor, (container) => {
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px;">
            <span>🛡</span> <span>Privacy Router Guard</span>
          </div>
        </div>
        <div style="font-size: 12px; color: #5B6776; margin-bottom: 12px;">
          Open Privacy Router side panel to scan this prompt on-device before sending.
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="pr-guard-open-panel-btn" type="button" style="background: #0B57D0; color: #fff; border: none; border-radius: 4px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">
            Open Privacy Router
          </button>
        </div>
      `;

      container.querySelector('#pr-guard-open-panel-btn')?.addEventListener('click', () => {
        this.dismiss();
        onOpenPanel();
      });
    });
  }

  dismiss(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
  }

  private createOrUpdate(anchor: HTMLElement, populate: (el: HTMLElement) => void): void {
    this.dismiss();

    const rect = anchor.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.id = 'privacy-router-guard-overlay';
    overlay.style.position = 'fixed';
    overlay.style.zIndex = '2147483647';
    overlay.style.bottom = `${Math.max(16, window.innerHeight - rect.top + 8)}px`;
    overlay.style.left = `${Math.max(16, rect.left)}px`;
    overlay.style.maxWidth = '360px';
    overlay.style.width = 'calc(100vw - 32px)';
    overlay.style.backgroundColor = '#FFFFFF';
    overlay.style.color = '#1A2330';
    overlay.style.borderRadius = '8px';
    overlay.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
    overlay.style.border = '1px solid #D0D7DE';
    overlay.style.padding = '14px';
    overlay.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    overlay.style.fontSize = '13px';
    overlay.style.lineHeight = '1.4';

    populate(overlay);
    document.body.appendChild(overlay);
    this.element = overlay;

    // Esc dismisses overlay without sending
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.dismiss();
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
  }
}
