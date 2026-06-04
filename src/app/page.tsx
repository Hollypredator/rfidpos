'use client';

import React from 'react';
import {
  CreditCard,
  Shield,
  Wifi,
  WifiOff,
  Smartphone,
  BarChart3,
  Users,
  Building2,
  Zap,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Layers,
  Lock,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const FEATURES = [
  {
    icon: <CreditCard size={28} />,
    title: 'RFID / NFC Ödeme',
    desc: 'Misafirler kartlarını dokundurarak anında ödeme yapar. PIN korumalı güvenli işlem.',
    color: 'var(--accent)',
  },
  {
    icon: <WifiOff size={28} />,
    title: 'Offline Çalışma',
    desc: 'İnternet kesilse bile POS çalışmaya devam eder. Bağlantı gelince otomatik senkronize olur.',
    color: 'var(--warning)',
  },
  {
    icon: <Smartphone size={28} />,
    title: 'El Terminali Uyumlu',
    desc: 'Sunmi, iMin gibi Android el terminallerinde native APK olarak çalışır.',
    color: 'var(--success)',
  },
  {
    icon: <BarChart3 size={28} />,
    title: 'Anlık Raporlar',
    desc: 'Lokasyon bazlı gelir, oda harcamaları ve işlem geçmişi tek panelden.',
    color: 'var(--info)',
  },
  {
    icon: <Users size={28} />,
    title: 'Çoklu Kullanıcı & Rol',
    desc: 'Garson, kasiyer, resepsiyonist, müdür — herkes kendi yetkisiyle çalışır.',
    color: '#a855f7',
  },
  {
    icon: <Shield size={28} />,
    title: 'Güvenli Altyapı',
    desc: 'Row Level Security ile veri izolasyonu. Her otel yalnızca kendi verisini görür.',
    color: 'var(--danger)',
  },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Kart veya Bileklik Ver', desc: 'Giriş esnasında RFID kart/bilekliği müşteriye tanımlayın ve cüzdana bakiye yükleyin.' },
  { step: '2', title: 'Kartı Dokundur', desc: 'Satış noktalarında müşteri kart veya bilekliğini POS cihazına dokundurur.' },
  { step: '3', title: 'PIN ile Onayla', desc: '4 haneli güvenlik PIN kodunu girerek ödeme tamamlanır. Bakiye anında düşer.' },
  { step: '4', title: 'Çıkışta İade Al', desc: 'Tüm harcamalar kart hesabından düşer. Çıkışta kalan bakiye tek tıkla iade edilir.' },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* ── Navbar ──────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CreditCard size={20} color="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700 }}>RFID<span style={{ color: 'var(--accent)' }}>POS</span></span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', minWidth: 'auto' }}
            title={theme === 'light' ? 'Koyu Tema' : 'Açık Tema'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <a href="/login" className="btn btn-primary btn-sm">Giriş Yap</a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="landing-hero">
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720 }}>
          <div className="badge badge-accent" style={{ marginBottom: 20, fontSize: 13 }}>
            <Zap size={14} /> Otel & Eğlence Merkezleri İçin Kapalı Devre Ödeme Sistemi
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: '-0.02em',
          }}>
            RFID Kart ve Bilekliklerle{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent-light), var(--success))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Nakit Taşımadan
            </span>{' '}
            Hızlı Ödeme Altyapısı
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2vw, 19px)',
            color: 'var(--muted)',
            lineHeight: 1.7,
            marginBottom: 36,
            maxWidth: 560,
            marginLeft: 'auto', marginRight: 'auto',
          }}>
            Oteller, aqua parklar, lunaparklar ve festival alanları için kapalı devre RFID ödeme platformu.
            Müşterileriniz nakit/kart taşımadan hızlıca harcama yapsın.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/login" className="btn btn-primary btn-lg" style={{ gap: 10 }}>
              <Lock size={18} />
              Sisteme Giriş Yap
              <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* Floating stats */}
        <div style={{
          display: 'flex', gap: 32, marginTop: 60,
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {[
            { value: '500ms', label: 'İşlem Süresi' },
            { value: '₺0', label: 'Kurulum Maliyeti' },
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '∞', label: 'Offline İşlem' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-light)' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────── */}
      <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Neden RFID POS?</h2>
          <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 500, margin: '0 auto' }}>
            Misafir deneyimini iyileştirin, operasyonlarınızı hızlandırın
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: `${f.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: f.color,
                marginBottom: 16,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ────────────────────── */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, rgba(99,102,241,0.03) 0%, transparent 100%)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Nasıl Çalışır?</h2>
            <p style={{ fontSize: 16, color: 'var(--muted)' }}>4 adımda kapalı devre ödeme</p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 24,
          }}>
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: 20, fontWeight: 800, color: 'white',
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Footer ──────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <CreditCard size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>RFID<span style={{ color: 'var(--accent)' }}>POS</span></span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          © 2026 RFID POS — Otel & Eğlence Merkezleri Kapalı Devre Ödeme Sistemi. Tüm hakları saklıdır.
        </p>
      </footer>
    </div>
  );
}
