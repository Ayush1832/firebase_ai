import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../ui/tokens.css';
import { SidePanelApp } from './SidePanelApp';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <SidePanelApp />
    </StrictMode>
  );
}
