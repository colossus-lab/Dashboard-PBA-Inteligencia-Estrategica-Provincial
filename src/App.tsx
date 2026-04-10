import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Landing } from './pages/Landing';
import { ReportView } from './pages/ReportView';
import { ExplorerIndex } from './pages/ExplorerIndex';
import { ExplorerDetail } from './pages/ExplorerDetail';
import { Chat } from './pages/Chat';
import React from 'react';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#f1f5f9',
          background: '#0a0f1c',
          minHeight: '100vh',
        }}>
          <h1 style={{ color: '#ef4444', fontSize: '2rem' }}>⚠️ Error de renderizado</h1>
          <pre style={{
            background: '#1e293b',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'left',
            overflowX: 'auto',
            marginTop: '20px',
            fontSize: '0.85rem',
            color: '#f59e0b',
          }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#00d4ff',
              color: '#0a0f1c',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Volver al Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/explorar" element={<ExplorerIndex />} />
            <Route path="/explorar/:datasetId" element={<ExplorerDetail />} />
            <Route path="/*" element={<ReportView />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
