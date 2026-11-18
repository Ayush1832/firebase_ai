import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../ui/tokens.css';

export function OptionsApp() {
  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px' }}>
      <h1>Privacy Router Settings</h1>
      <p style={{ color: 'var(--muted)' }}>
        Configure detection packs, custom terms, cloud consent, and tester configurations.
      </p>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <OptionsApp />
    </React.StrictMode>
  );
}
