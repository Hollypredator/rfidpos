'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary — Yakalanmamış React hatalarını yakalar ve
 * kullanıcıya anlamlı bir hata ekranı gösterir. Beyaz ekran (white screen)
 * sorunlarını önler.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // TODO: Production'da buraya Sentry/LogRocket entegrasyonu eklenecek
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'var(--background, #0f172a)',
            color: 'var(--foreground, #f8fafc)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              background: 'var(--card, #1e293b)',
              border: '1px solid var(--border, #334155)',
              borderRadius: 20,
              padding: 32,
              textAlign: 'center',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <AlertTriangle size={36} color="#ef4444" />
            </div>

            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Beklenmedik Bir Hata Oluştu
            </h2>

            <p
              style={{
                fontSize: 14,
                color: 'var(--muted, #94a3b8)',
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Uygulama beklenmeyen bir hata ile karşılaştı. Lütfen sayfayı
              yenilemeyi deneyin veya ana sayfaya dönün.
            </p>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                  textAlign: 'left',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: '#fca5a5',
                  maxHeight: 200,
                  overflow: 'auto',
                  wordBreak: 'break-word',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 8, color: '#ef4444' }}>
                  {this.state.error.name}: {this.state.error.message}
                </strong>
                {this.state.errorInfo?.componentStack && (
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 11, opacity: 0.7 }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: 'var(--accent, #6366f1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={16} />
                Tekrar Dene
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  background: 'transparent',
                  color: 'var(--muted, #94a3b8)',
                  border: '1px solid var(--border, #334155)',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <Home size={16} />
                Ana Sayfa
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
