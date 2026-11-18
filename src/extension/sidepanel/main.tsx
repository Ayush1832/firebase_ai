import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../ui/tokens.css';

export function SidePanelApp() {
  return (
    <div style={{ padding: '16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛡</span> Privacy Router
        </h2>
        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: 'var(--radius-chip)', backgroundColor: 'var(--surface)', color: 'var(--muted)' }}>
          ● Ready
        </span>
      </header>
      <main>
        <p style={{ color: 'var(--muted)' }}>
          Welcome to Privacy Router. Your personal financial data stays on your device.
        </p>
      </main>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <SidePanelApp />
    </React.StrictMode>
  );
}
