'use client';

import React, { useState } from 'react';
import { Lock, Copy, Check, LogOut, Mail, HelpCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function BillingLockScreen() {
  const { tenant, signOut } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (tenant?.id) {
      navigator.clipboard.writeText(tenant.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (!tenant) return null;

  const isSuspended = tenant.status === 'suspended';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      background: 'radial-gradient(circle at center, #1e1b4b 0%, #09090b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      color: '#f4f4f5',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Background Decorative Glows */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        top: '20%',
        left: '20%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1) 0%, transparent 70%)',
        bottom: '10%',
        right: '15%',
        pointerEvents: 'none'
      }} />

      {/* Lock Card Container */}
      <div className="glass-card" style={{
        maxWidth: 500,
        width: '100%',
        padding: '40px 32px',
        borderRadius: 24,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Status Icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          background: isSuspended 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.05))' 
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.05))',
          border: isSuspended ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          color: isSuspended ? '#ef4444' : '#6366f1',
          boxShadow: isSuspended ? '0 0 20px rgba(239, 68, 68, 0.15)' : '0 0 20px rgba(99, 102, 241, 0.15)',
          animation: 'pulse 2s infinite alternate'
        }}>
          {isSuspended ? <ShieldAlert size={36} /> : <Lock size={34} />}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          marginBottom: 12,
          letterSpacing: '-0.025em',
          background: 'linear-gradient(to right, #ffffff, #d4d4d8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {isSuspended ? 'Aboneliğiniz Askıya Alındı' : 'Hesap Aktivasyonu Bekleniyor'}
        </h1>

        {/* Description */}
        <p style={{
          fontSize: 14,
          color: '#a1a1aa',
          lineHeight: '1.6',
          marginBottom: 28,
          padding: '0 8px'
        }}>
          Donanım siparişinizin teslimi, kurulumu ve sistem lisansınızın aktifleştirilmesi işlemleri için lütfen şirket satış veya destek birimi ile iletişime geçiniz.
        </p>

        {/* Info Grid (Tenant Details) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 28,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#71717a' }}>Kayıtlı Otel Adı</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f5' }}>{tenant.name}</span>
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#71717a' }}>Referans Otel ID</span>
              <span style={{ fontSize: 12, color: '#71717a', fontStyle: 'italic' }}>Destek ekibine iletiniz</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: 8,
              padding: '8px 12px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: '#38bdf8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '85%'
              }}>
                {tenant.id}
              </span>
              <button 
                onClick={handleCopyId}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? '#4ade80' : '#a1a1aa',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.2s'
                }}
                title="ID Kopyala"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Buttons / Actions */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <a 
            href={`mailto:destek@hotelpos.com?subject=Otel Aktivasyon Talebi (${tenant.name})&body=Merhaba,%0D%0A%0D%0A${tenant.name} oteli için donanım kurulumu ve abonelik aktivasyon talebinde bulunmak istiyoruz.%0D%0A%0D%0AOtel ID: ${tenant.id}%0D%0A%0D%0Aİyi çalışmalar.`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: 14,
              padding: '12px 24px',
              borderRadius: 12,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.35)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
            }}
          >
            <Mail size={16} /> Satış / Destek Birimiyle Görüş
          </a>

          <button 
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#d4d4d8',
              fontWeight: 500,
              fontSize: 14,
              padding: '12px 24px',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
          >
            <LogOut size={15} /> Güvenli Çıkış Yap
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 15px rgba(99, 102, 241, 0.1); }
          100% { transform: scale(1.03); box-shadow: 0 0 25px rgba(99, 102, 241, 0.25); }
        }
      `}</style>
    </div>
  );
}
