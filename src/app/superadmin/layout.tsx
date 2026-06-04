'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, CreditCard, Package, MessageSquare, 
  LogOut, Shield, Sun, Moon, Menu, Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const NAV_ITEMS = [
  { href: '/superadmin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/superadmin/tenants', label: 'Oteller', icon: <Building2 size={18} /> },
  { href: '/superadmin/users', label: 'Kullanıcılar', icon: <Users size={18} /> },
  { href: '/superadmin/payments', label: 'Ödemeler & Onay', icon: <CreditCard size={18} /> },
  { href: '/superadmin/orders', label: 'Donanım Siparişleri', icon: <Package size={18} /> },
  { href: '/superadmin/support', label: 'Destek Talepleri', icon: <MessageSquare size={18} /> },
];

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (profile && profile.role !== 'super_admin') {
      if (['waiter', 'cashier'].includes(profile.role)) {
        router.push('/pos');
      } else {
        router.push('/dashboard');
      }
    }
  }, [profile, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div>
      {/* Mobile Header */}
      <header className="mobile-header" style={{
        display: 'none',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--danger), #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Shield size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>RFID POS</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Sidebar */}
      <aside className="sidebar" style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        width: 240,
        background: 'var(--card-bg)',
        borderRight: '1px solid var(--border)',
        zIndex: 99,
        transform: mobileMenuOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.3s ease-in-out'
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--danger), #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Shield size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>RFID POS</div>
            <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>Super Admin</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <button
                key={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => {
                  router.push(item.href);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px 20px',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? '3px solid var(--danger)' : '3px solid transparent',
                  color: isActive ? 'var(--foreground)' : 'var(--muted)',
                  textAlign: 'left',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ color: isActive ? 'var(--danger)' : 'inherit' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--danger), #dc2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: 'white', flexShrink: 0,
            }}>
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Sistem Yöneticisi'}</div>
              <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 500 }}>Platform Yöneticisi</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={toggleTheme}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{theme === 'light' ? 'Koyu' : 'Açık'}</span>
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--danger)' }}
              onClick={handleSignOut}
            >
              <LogOut size={14} />
              <span>Çıkış</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{
        marginLeft: 240,
        padding: '30px 40px',
        minHeight: '100vh',
        background: 'var(--background)'
      }}>
        {children}
      </main>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 98
          }}
        />
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .sidebar {
            transform: ${mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)'} !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 70px 16px 30px !important;
          }
          .mobile-header {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
