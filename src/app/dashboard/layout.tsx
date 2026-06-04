'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  DoorOpen,
  Users,
  ArrowLeftRight,
  Settings,
  LogOut,
  CreditCard,
  ChevronLeft,
  Menu,
  Smartphone,
  Sparkles,
  Search,
  Plus,
  UserCheck,
  BarChart3,
  Sun,
  Moon,
  ConciergeBell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { createClient } from '../../utils/supabase';
import RfidLookupModal from '../../components/RfidLookupModal';
import BillingLockScreen from '../../components/BillingLockScreen';
import SupportChatbot from '../../components/SupportChatbot';
import { useTerminology } from '../../hooks/useTerminology';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Genel Bakış', icon: <LayoutDashboard size={18} /> },
  { href: '/dashboard/reception', label: 'Resepsiyon', icon: <ConciergeBell size={18} /> },
  { href: '/dashboard/rooms', label: 'Odalar', icon: <DoorOpen size={18} /> },
  { href: '/dashboard/guests', label: 'Misafirler', icon: <Users size={18} /> },
  { href: '/dashboard/users', label: 'Personel', icon: <UserCheck size={18} /> },
  { href: '/dashboard/reports', label: 'Raporlar', icon: <BarChart3 size={18} /> },
  { href: '/dashboard/transactions', label: 'İşlemler', icon: <ArrowLeftRight size={18} /> },
  { href: '/dashboard/settings', label: 'Ayarlar', icon: <Settings size={18} /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, tenant, signOut, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const t = useTerminology();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Genel Bakış', icon: <LayoutDashboard size={18} />, roles: ['hotel_admin', 'manager', 'platform_owner'] },
    { href: '/dashboard/reception', label: t.receptionLabel, icon: <ConciergeBell size={18} />, roles: ['hotel_admin', 'manager', 'receptionist', 'platform_owner'] },
    { href: '/dashboard/rooms', label: t.roomsLabel, icon: <DoorOpen size={18} />, roles: ['hotel_admin', 'manager', 'receptionist', 'platform_owner'] },
    { href: '/dashboard/guests', label: t.guestsLabel, icon: <Users size={18} />, roles: ['hotel_admin', 'manager', 'receptionist', 'platform_owner'] },
    { href: '/dashboard/users', label: 'Personel', icon: <UserCheck size={18} />, roles: ['hotel_admin', 'platform_owner'] },
    { href: '/dashboard/reports', label: 'Raporlar', icon: <BarChart3 size={18} />, roles: ['hotel_admin', 'manager', 'platform_owner'] },
    { href: '/dashboard/transactions', label: 'İşlemler', icon: <ArrowLeftRight size={18} />, roles: ['hotel_admin', 'manager', 'platform_owner'] },
    { href: '/dashboard/settings', label: 'Ayarlar', icon: <Settings size={18} />, roles: ['hotel_admin', 'platform_owner'] },
  ];

  // Path-role authorization mapping
  const pathPermissions: Record<string, string[]> = {
    '/dashboard': ['hotel_admin', 'manager', 'platform_owner'],
    '/dashboard/reception': ['hotel_admin', 'manager', 'receptionist', 'platform_owner'],
    '/dashboard/rooms': ['hotel_admin', 'manager', 'receptionist', 'platform_owner'],
    '/dashboard/guests': ['hotel_admin', 'manager', 'receptionist', 'platform_owner'],
    '/dashboard/users': ['hotel_admin', 'platform_owner'],
    '/dashboard/reports': ['hotel_admin', 'manager', 'platform_owner'],
    '/dashboard/transactions': ['hotel_admin', 'manager', 'platform_owner'],
    '/dashboard/settings': ['hotel_admin', 'platform_owner'],
  };

  const checkPathAccess = React.useCallback((currentPath: string, userRole: string): boolean => {
    const keys = Object.keys(pathPermissions).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (currentPath === key || currentPath.startsWith(key + '/')) {
        return pathPermissions[key].includes(userRole);
      }
    }
    return false;
  }, []);

  const getDefaultPath = React.useCallback((userRole: string): string => {
    if (['hotel_admin', 'manager', 'platform_owner'].includes(userRole)) return '/dashboard';
    if (userRole === 'receptionist') return '/dashboard/reception';
    return '/pos';
  }, []);

  // RFID States
  const [scannedCardUid, setScannedCardUid] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorGuests, setSimulatorGuests] = useState<any[]>([]);
  const [customSimUid, setCustomSimUid] = useState('');

  const supabase = React.useMemo(() => createClient(), []);

  const loadSimulatorGuests = async () => {
    if (!tenant?.id) return;
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('id, room_number')
      .eq('tenant_id', tenant.id);
    
    const roomIds = (roomsData || []).map((r: any) => r.id);
    if (roomIds.length > 0) {
      const { data: guestsData } = await supabase
        .from('guests')
        .select('*')
        .in('room_id', roomIds);
      
      const mapped = (guestsData || []).map((g: any) => {
        const room = (roomsData || []).find((r: any) => r.id === g.room_id);
        return { ...g, room_number: room?.room_number || '—' };
      });
      setSimulatorGuests(mapped);
    } else {
      setSimulatorGuests([]);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      loadSimulatorGuests();
    }
  }, [tenant?.id]);

  // Global Keyboard Wedge RFID listener
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key.length > 1 && e.key !== 'Enter') {
        return;
      }

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 4) {
          const scanned = bufferRef.current;
          bufferRef.current = '';
          setScannedCardUid(scanned);
        } else {
          bufferRef.current = '';
        }
      } else {
        if (bufferRef.current.length > 0 && timeDiff > 45) {
          bufferRef.current = e.key;
        } else {
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Listen to custom rfid-db-updated event to reload list
  useEffect(() => {
    const handleDbUpdate = () => {
      loadSimulatorGuests();
    };
    window.addEventListener('rfid-db-updated', handleDbUpdate);
    return () => {
      window.removeEventListener('rfid-db-updated', handleDbUpdate);
    };
  }, [tenant?.id]);

  // Android Javascript Bridge Listener for Dashboard card lookup
  useEffect(() => {
    const handleAndroidCard = (uid: string) => {
      if (pathname === '/dashboard/reception' || pathname === '/pos') {
        return;
      }
      setScannedCardUid(uid);
    };
    (window as any).handleRFIDCard = handleAndroidCard;
    return () => {
      if ((window as any).handleRFIDCard === handleAndroidCard) {
        delete (window as any).handleRFIDCard;
      }
    };
  }, [pathname]);

  useEffect(() => {
    if (!isLoading) {
      if (!profile) {
        router.push('/login');
        return;
      }

      const role = profile.role;
      if (role === 'super_admin') {
        router.push('/superadmin');
        return;
      }
      if (['waiter', 'cashier'].includes(role)) {
        router.push('/pos');
        return;
      }

      const hasAccess = checkPathAccess(pathname, role);
      if (!hasAccess) {
        const defaultPath = getDefaultPath(role);
        router.push(defaultPath);
      }
    }
  }, [profile, pathname, router, isLoading, checkPathAccess, getDefaultPath]);

  const hasAccess = profile && checkPathAccess(pathname, profile.role);
  const filteredNavItems = navItems.filter((item) => profile && item.roles.includes(profile.role));

  const isExpired = tenant?.subscription_expires_at ? new Date(tenant.subscription_expires_at) < new Date() : false;
  const showLockScreen = profile?.role !== 'super_admin' && (tenant?.status !== 'active' || isExpired);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)', color: 'var(--muted)' }}>
        Yükleniyor...
      </div>
    );
  }

  if (!profile || !hasAccess) {
    return null;
  }

  if (showLockScreen) {
    return <BillingLockScreen />;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div>
      {/* Mobile Menu Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className="sidebar" style={mobileMenuOpen ? { display: 'flex' } : undefined}>
        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <CreditCard size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>RFID POS</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {tenant?.name || `${t.tenantLabel} Yönetimi`}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {filteredNavItems.map((item) => (
            <button
              key={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              onClick={() => {
                router.push(item.href);
                setMobileMenuOpen(false);
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <div style={{ padding: '12px 20px', marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 8 }}>
              Hızlı Erişim
            </div>
          </div>

          <button
            className="sidebar-link"
            onClick={() => setScannedCardUid('manual')}
            style={{ marginBottom: 4 }}
          >
            <Search size={18} />
            Kart Sorgula
          </button>

          <button
            className="sidebar-link"
            onClick={() => router.push('/pos')}
          >
            <Smartphone size={18} />
            POS Terminali
          </button>
        </nav>

        {/* User Profile */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: 'white', flexShrink: 0,
            }}>
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || 'Kullanıcı'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {profile?.role === 'hotel_admin' ? `${t.tenantLabel} Yöneticisi` : profile?.role || ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={toggleTheme}
              title={theme === 'light' ? 'Koyu Tema' : 'Açık Tema'}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{theme === 'light' ? 'Koyu' : 'Açık'}</span>
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--danger)' }}
              onClick={handleSignOut}
              title="Çıkış Yap"
            >
              <LogOut size={14} />
              <span>Çıkış</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: 'none',
          position: 'fixed', top: 16, left: 16, zIndex: 50,
          width: 40, height: 40, borderRadius: 10,
          background: 'var(--card)', border: '1px solid var(--border)',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--foreground)', cursor: 'pointer',
        }}
        className="mobile-menu-btn"
      >
        <Menu size={20} />
      </button>

      {/* Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Rfid Lookup Modal */}
      <RfidLookupModal
        cardUid={scannedCardUid}
        onClose={() => setScannedCardUid(null)}
        onRefreshStats={() => {
          window.dispatchEvent(new CustomEvent('rfid-db-updated'));
          loadSimulatorGuests();
        }}
      />

      {/* Floating RFID Simulator Button (Only in Mock Mode / Localhost) */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 900 }}>
        {/* Toggle Button */}
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 18px',
            background: showSimulator ? 'var(--accent)' : 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            color: showSimulator ? 'white' : 'var(--foreground)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease',
          }}
        >
          <CreditCard size={16} className={showSimulator ? '' : 'animate-pulse'} />
          <span>RFID Simülatörü</span>
          <span style={{
            background: 'var(--success-glow)',
            color: 'var(--success-light)',
            fontSize: 9,
            padding: '2px 5px',
            borderRadius: 4,
            fontWeight: 800
          }}>MOCK</span>
        </button>

        {/* Simulator Drawer Panel */}
        {showSimulator && (
          <div style={{
            position: 'absolute',
            bottom: 60,
            right: 0,
            width: 320,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: 16,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: 450,
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--foreground)' }}>
                <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                RFID Kart Test Paneli
              </span>
              <button 
                onClick={() => setShowSimulator(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11 }}
              >
                Kapat
              </button>
            </div>

            {/* Simulated hardware beep test */}
            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
              Resepsiyon USB Okuyucusunu simüle etmek için aşağıdaki butonlara tıklayın veya klavyenizden RFID tarama girişi yapın.
            </div>

            {/* List of active seeded guests */}
            <div>
              <span style={{ fontSize: 10, fontWeight: 650, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Sistemdeki Aktif Kartlar</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {simulatorGuests.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '10px 0', border: '1px dashed var(--border)', borderRadius: 10 }}>
                    Kayıtlı misafir bulunmuyor
                  </div>
                ) : (
                  simulatorGuests.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setScannedCardUid(g.card_uid)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        background: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--card-hover)';
                        e.currentTarget.style.borderColor = 'var(--border-light)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--background)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{g.guest_name}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t.roomLabel} {g.room_number}</div>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 6px', borderRadius: 4 }}>
                        {g.card_uid}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Simulate Random unassigned card */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <button
                onClick={() => {
                  const randomHex = Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase();
                  setScannedCardUid(randomHex);
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'var(--warning-glow)',
                  border: '1px solid rgba(217, 119, 6, 0.2)',
                  borderRadius: 12,
                  color: 'var(--warning)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Plus size={14} />
                Tanımsız Yeni Kart Okut
              </button>
            </div>

            {/* Manual card UID input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 650, color: 'var(--muted)', textTransform: 'uppercase' }}>Manuel Kart UID Yaz</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Örn: 90ABCDEF..."
                  value={customSimUid}
                  onChange={(e) => setCustomSimUid(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    color: 'var(--foreground)',
                    fontSize: 12
                  }}
                />
                <button
                  onClick={() => {
                    if (customSimUid.trim()) {
                      setScannedCardUid(customSimUid.trim());
                      setCustomSimUid('');
                    }
                  }}
                  disabled={!customSimUid.trim()}
                  style={{
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Okut
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Destek Chatbot Modülü (Sadece hotel_admin ve manager rolleri görebilir) */}
      {tenant && profile && (
        <SupportChatbot
          tenantId={tenant.id}
          tenantName={tenant.name}
          userRole={profile.role}
        />
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
