'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CreditCard, Building2, User, Mail, Lock, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

export default function RegisterPage() {
  const [hotelName, setHotelName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [allowSelfRegister, setAllowSelfRegister] = useState<boolean | null>(null);

  const { signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('rfid_platform_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAllowSelfRegister(!!parsed.allowSelfRegister);
      } catch (e) {
        console.error(e);
        setAllowSelfRegister(false);
      }
    } else {
      setAllowSelfRegister(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allowSelfRegister) {
      setError('Kayıt alımları kapatılmıştır.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsLoading(true);
    const { error: signUpError } = await signUp(email, password, fullName, 'hotel_admin');

    if (signUpError) {
      setError(signUpError);
      setIsLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
    }
  };

  if (allowSelfRegister === null) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (!allowSelfRegister) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--danger-glow)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, color: 'var(--danger)'
          }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Açık Kayıtlar Kapatılmıştır</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 24 }}>
            Sisteme yeni işletme kayıt alımları geçici olarak durdurulmuştur. İşletmenizi kaydettirmek için lütfen platform yöneticisi veya satış temsilcisi ile iletişime geçin.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => router.push('/login')}
            style={{ width: '100%' }}
          >
            Giriş Ekranına Dön
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--success-glow)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <CheckCircle size={32} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Kayıt Başarılı!</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>
            Oteliniz oluşturuldu. Yönetim paneline yönlendiriliyorsunuz...
          </p>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Image
            src="/logo.png"
            alt="RFID POS Logo"
            width={80}
            height={80}
            style={{
              borderRadius: 16, 
              objectFit: 'contain',
              marginBottom: 16,
              boxShadow: '0 8px 32px rgba(16,185,129,0.15)' 
            }} 
          />
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Otel Kaydı Oluştur</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>RFID POS Sistemine otelinizi ekleyin</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--danger-glow)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--danger)',
            fontSize: 13,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="input-label">
              <Building2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Otel Adı
            </label>
            <input
              type="text"
              className="input"
              placeholder="Grand Paradise Hotel"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="input-label">
              <User size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Ad Soyad
            </label>
            <input
              type="text"
              className="input"
              placeholder="Ahmet Yılmaz"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="input-label">
              <Mail size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              E-posta
            </label>
            <input
              type="email"
              className="input"
              placeholder="yonetici@otel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div>
              <label className="input-label">
                <Lock size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Şifre
              </label>
              <input
                type="password"
                className="input"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="input-label">Şifre Tekrar</label>
              <input
                type="password"
                className="input"
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-success btn-lg"
            disabled={isLoading}
            style={{ width: '100%', marginBottom: 16 }}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Building2 size={18} />}
            {isLoading ? 'Otel oluşturuluyor...' : 'Oteli Kaydet ve Başla'}
          </button>
        </form>

        {/* Login Link */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Zaten hesabınız var mı?{' '}
            <a href="/login" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 500 }}>
              Giriş Yap
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
