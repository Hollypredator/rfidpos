'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signIn, user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  React.useEffect(() => {
    if (user && profile && !isLoading) {
      const role = profile.role;
      let redirectPath = '/dashboard';
      if (role === 'super_admin') {
        redirectPath = '/superadmin';
      } else if (['waiter', 'cashier'].includes(role)) {
        redirectPath = '/pos';
      }
      router.push(redirectPath);
    }
  }, [user, profile, router, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);
    
    if (signInError) {
      setError(signInError);
      setIsLoading(false);
    } else {
      // Client-side role-based redirect (supports fun_ prefixed emails as well)
      const role = email.startsWith('super') 
        ? 'super_admin' 
        : (email.startsWith('waiter') || email.includes('waiter'))
        ? 'waiter' 
        : (email.startsWith('receptionist') || email.includes('receptionist') || email.includes('kasa'))
        ? 'receptionist' 
        : (email.startsWith('cashier') || email.includes('cashier'))
        ? 'cashier'
        : 'hotel_admin';

      let redirectPath = '/dashboard';
      if (role === 'super_admin') {
        redirectPath = '/superadmin';
      } else if (role === 'waiter' || role === 'cashier') {
        redirectPath = '/pos';
      }

      router.push(redirect || redirectPath);
      router.refresh();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 8px 32px rgba(99,102,241,0.25)'
          }}>
            <CreditCard size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>RFID POS Sistemi</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Hesabınıza giriş yapın</p>
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
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="input-label">E-posta</label>
            <input
              type="email"
              className="input"
              placeholder="ornek@otel.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="input-label">Şifre</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => { setShowPassword(!showPassword)} }
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                  padding: 4, display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isLoading}
            style={{ width: '100%', marginBottom: 16 }}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        {/* Register Link */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Henüz hesabınız yok mu?{' '}
            <a href="/register" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 500 }}>
              Kayıt Oluştur
            </a>
          </p>
        </div>

        {/* Demo Credentials Helper */}
        <div style={{
          padding: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12
        }}>
          <div style={{ fontWeight: 600, color: 'var(--accent-light)', marginBottom: 12, textAlign: 'center' }}>
            Yerel Geliştirici Demo Hesapları
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🏨 OTEL KONSEPTİ
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button 
                  type="button"
                  onClick={() => { setEmail('admin@hotelpos.com'); setPassword('demo1234'); }}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11, width: '100%', border: '1px solid var(--border)' }}
                >
                  🔑 admin@hotelpos.com (Yönetici)
                </button>
                <button 
                  type="button"
                  onClick={() => { setEmail('waiter@hotelpos.com'); setPassword('demo1234'); }}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11, width: '100%', border: '1px solid var(--border)' }}
                >
                  🔑 waiter@hotelpos.com (Garson - POS)
                </button>
                <button 
                  type="button"
                  onClick={() => { setEmail('receptionist@hotelpos.com'); setPassword('demo1234'); }}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11, width: '100%', border: '1px solid var(--border)' }}
                >
                  🔑 receptionist@hotelpos.com (Resepsiyon)
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎡 EĞLENCE MERKEZİ KONSEPTİ
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button 
                  type="button"
                  onClick={() => { setEmail('fun_admin@hotelpos.com'); setPassword('demo1234'); }}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11, width: '100%', border: '1px solid var(--border)' }}
                >
                  🔑 fun_admin@hotelpos.com (Yönetici)
                </button>
                <button 
                  type="button"
                  onClick={() => { setEmail('fun_waiter@hotelpos.com'); setPassword('demo1234'); }}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11, width: '100%', border: '1px solid var(--border)' }}
                >
                  🔑 fun_waiter@hotelpos.com (Garson - POS)
                </button>
                <button 
                  type="button"
                  onClick={() => { setEmail('fun_kasa@hotelpos.com'); setPassword('demo1234'); }}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11, width: '100%', border: '1px solid var(--border)' }}
                >
                  🔑 fun_kasa@hotelpos.com (Kasa Görevlisi)
                </button>
              </div>
            </div>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 10, marginTop: 10, textAlign: 'center' }}>
            * Şifre alanına herhangi bir şey yazıp giriş yapabilirsiniz.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: 40 }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--accent)' }} />
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Yükleniyor...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

