'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Settings, X } from 'lucide-react';

export default function NfcStatusBanner() {
  const [nfcStatus, setNfcStatus] = useState<string>('enabled'); // 'enabled', 'disabled', 'not_supported'
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkStatus = () => {
        if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.checkNfcStatus === 'function') {
          const status = (window as any).AndroidBridge.checkNfcStatus();
          setNfcStatus(status);
        }
      };

      // Check immediately
      checkStatus();

      // Define global listener for MainActivity broadcasts
      (window as any).onNFCStatusChanged = (status: string) => {
        setNfcStatus(status);
      };

      // Periodic check every 5 seconds
      const interval = setInterval(checkStatus, 5000);
      return () => {
        clearInterval(interval);
        delete (window as any).onNFCStatusChanged;
      };
    }
  }, []);

  const handleOpenSettings = () => {
    if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.openNfcSettings === 'function') {
      (window as any).AndroidBridge.openNfcSettings();
    }
  };

  if (nfcStatus !== 'disabled' || isDismissed) {
    return null;
  }

  return (
    <div 
      className="nfc-warning-banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
        color: '#ffffff',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: '0 4px 20px rgba(220, 38, 38, 0.25)',
        animation: 'slideDownBanner 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
        <AlertTriangle size={16} className="animate-pulse" style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Kart okuma işlemi için cihazınızın NFC özelliği kapalıdır.
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button 
          onClick={handleOpenSettings}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: '#ffffff',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        >
          <Settings size={12} />
          NFC Ayarlarını Aç
        </button>
        <button 
          onClick={() => setIsDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
        >
          <X size={14} />
        </button>
      </div>

      <style jsx>{`
        @keyframes slideDownBanner {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
