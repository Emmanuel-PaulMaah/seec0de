import React from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
// Self-hosted so the UI font resolves offline — no CDN, no fallback to Segoe UI.
import '@fontsource-variable/inter';
import App from './App';
import { ConfirmProvider } from './components/ui/dialog';
import './styles/global.css';

const root = createRoot(document.getElementById('root'));
// reducedMotion="user": every motion/react animation drops transform/layout
// movement when the OS "reduce motion" setting is on (CSS is handled in
// global.css).
root.render(
  <MotionConfig reducedMotion="user">
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  </MotionConfig>
);
