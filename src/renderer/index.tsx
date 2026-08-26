import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { TooltipProvider } from './components/ui/tooltip';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#f87171', background: '#000', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', overflow: 'auto', height: '100%' }}>
          <h2 style={{ color: '#fff', marginBottom: 8 }}>Runtime Error</h2>
          <div>{this.state.error.message}</div>
          <div style={{ marginTop: 8, color: '#888' }}>{this.state.error.stack}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = createRoot(document.getElementById('root')!);
root.render(<ErrorBoundary><TooltipProvider><App /></TooltipProvider></ErrorBoundary>);
