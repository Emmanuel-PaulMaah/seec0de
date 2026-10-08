import React from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted so the UI font resolves offline — no CDN, no fallback to Segoe UI.
import '@fontsource-variable/inter';
import App from './App';
import './styles/global.css';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
