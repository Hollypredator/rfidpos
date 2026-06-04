'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ══════════════════════════════════════════════
// Toast Notification System
// ══════════════════════════════════════════════

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (options: { message: string; type?: ToastType; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: {
    bg: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
    border: 'rgba(16,185,129,0.25)',
    color: 'var(--success)',
    icon: 'var(--success)',
  },
  error: {
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
    border: 'rgba(239,68,68,0.25)',
    color: 'var(--danger)',
    icon: 'var(--danger)',
  },
  warning: {
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
    border: 'rgba(245,158,11,0.25)',
    color: 'var(--warning)',
    icon: 'var(--warning)',
  },
  info: {
    bg: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))',
    border: 'rgba(99,102,241,0.25)',
    color: 'var(--accent)',
    icon: 'var(--accent)',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    // Start exit animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    // Remove after animation completes
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 280);
  }, []);

  const toast = useCallback(({ message, type = 'info', duration = 3000 }: { message: string; type?: ToastType; duration?: number }) => {
    counterRef.current += 1;
    const id = `toast-${counterRef.current}-${Date.now()}`;
    const newToast: Toast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast Container — fixed top-right */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxWidth: 400,
            minWidth: 280,
            pointerEvents: 'none',
          }}
        >
          {toasts.map((t) => {
            const colors = TOAST_COLORS[t.type];
            return (
              <div
                key={t.id}
                style={{
                  background: colors.bg,
                  backdropFilter: 'blur(16px)',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  animation: t.exiting ? 'toastSlideOut 0.28s ease forwards' : 'toastSlideIn 0.3s ease',
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
                onClick={() => removeToast(t.id)}
              >
                <div style={{ color: colors.icon, flexShrink: 0, marginTop: 1 }}>
                  {TOAST_ICONS[t.type]}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: 'var(--foreground)' }}>
                  {t.message}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeToast(t.id); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', padding: 2, flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast Animations CSS */}
      <style jsx global>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
