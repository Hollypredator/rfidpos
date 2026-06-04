'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings, Save, Loader2, Building2, MapPin, Plus, Trash2, Globe, Clock, X,
  Smartphone, Activity, ShieldCheck, Cpu
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { createClient } from '../../../utils/supabase';
import { Location, Device } from '../../../types';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../contexts/ToastContext';

export default function SettingsPage() {
  const { tenant, refreshProfile } = useAuth();
  const supabase = createClient();
  const t = useTerminology();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'info' | 'locations' | 'devices' | 'billing'>('info');

  // Hotel Info States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [timezone, setTimezone] = useState('Europe/Istanbul');
  const [businessType, setBusinessType] = useState<'hotel' | 'entertainment'>('hotel');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [dailySpendingLimit, setDailySpendingLimit] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Locations States
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocName, setNewLocName] = useState('');
  const [newLocSlug, setNewLocSlug] = useState('');

  // Devices States
  const [devices, setDevices] = useState<Device[]>([]);
  const [newDevName, setNewDevName] = useState('');
  const [newDevType, setNewDevType] = useState<'handheld' | 'desktop' | 'tablet' | 'kiosk'>('handheld');
  const [newDevHardwareId, setNewDevHardwareId] = useState('');
  const [newDevLoc, setNewDevLoc] = useState('');
  const [devSaving, setDevSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setEmail(tenant.email || '');
      setPhone(tenant.phone || '');
      setAddress(tenant.address || '');
      setCurrency(tenant.currency);
      setTimezone(tenant.timezone);
      setBusinessType((tenant.settings as any)?.business_type || 'hotel');
      setDepositAmount((tenant.settings as any)?.deposit_amount || 0);
      setDailySpendingLimit((tenant.settings as any)?.daily_spending_limit || 0);
      fetchLocations();
      fetchDevices();
    }
  }, [tenant]);

  const fetchLocations = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from('locations')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('name');
    setLocations(data || []);
  };

  const fetchDevices = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from('devices')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('device_name');
    setDevices(data || []);
  };

  const handleSaveInfo = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        name,
        email,
        phone,
        address,
        currency,
        timezone,
        settings: {
          ...(tenant.settings || {}),
          business_type: businessType,
          deposit_amount: depositAmount,
          daily_spending_limit: dailySpendingLimit,
        }
      })
      .eq('id', tenant.id);

    if (!error) {
      setSaved(true);
      await refreshProfile();
      toast({ message: 'Ayarlar başarıyla kaydedildi!', type: 'success' });
      setTimeout(() => setSaved(false), 2000);
    } else {
      toast({ message: 'Kaydetme sırasında hata oluştu: ' + error.message, type: 'error' });
    }
    setSaving(false);
  };

  const addLocation = async () => {
    if (!tenant?.id || !newLocName) return;
    const slug = newLocSlug || newLocName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const { error } = await supabase.from('locations').insert({
      tenant_id: tenant.id,
      name: newLocName,
      slug,
      icon: 'MapPin',
    });
    if (!error) {
      setNewLocName('');
      setNewLocSlug('');
      fetchLocations();
      toast({ message: 'Lokasyon başarıyla eklendi!', type: 'success' });
    } else {
      toast({ message: 'Lokasyon eklenirken hata oluştu.', type: 'error' });
    }
  };

  const deleteLocation = async (id: string) => {
    if (!confirm('Bu lokasyonu silmek istediğinize emin misiniz? (Bağlı işlemler etkilenebilir)')) return;
    await supabase.from('locations').delete().eq('id', id);
    fetchLocations();
    toast({ message: 'Lokasyon silindi.', type: 'warning' });
  };

  const addDevice = async () => {
    if (!tenant?.id || !newDevName) return;
    setDevSaving(true);
    
    // Auto generate Hardware ID if left blank
    const hardwareId = newDevHardwareId || `HW-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const { error } = await supabase.from('devices').insert({
      tenant_id: tenant.id,
      device_name: newDevName,
      device_type: newDevType,
      hardware_id: hardwareId,
      assigned_location: newDevLoc || null,
      is_active: true,
      last_seen_at: new Date().toISOString()
    });

    if (!error) {
      setNewDevName('');
      setNewDevHardwareId('');
      setNewDevLoc('');
      fetchDevices();
      toast({ message: 'Cihaz başarıyla kaydedildi!', type: 'success' });
    } else {
      toast({ message: 'Cihaz kaydedilirken hata oluştu: ' + error.message, type: 'error' });
    }
    setDevSaving(false);
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('Bu cihazın kaydını silmek istediğinize emin misiniz? (Cihazın POS oturumu sonlandırılacaktır)')) return;
    await supabase.from('devices').delete().eq('id', id);
    fetchDevices();
    toast({ message: 'Cihaz kaydı silindi.', type: 'warning' });
  };

  const toggleDeviceActive = async (device: Device) => {
    const { error } = await supabase
      .from('devices')
      .update({ is_active: !device.is_active })
      .eq('id', device.id);
    if (!error) {
      fetchDevices();
    }
  };

  const getDeviceTypeLabel = (type: string) => {
    switch (type) {
      case 'handheld': return 'El Terminali';
      case 'desktop': return 'Masaüstü PC';
      case 'tablet': return 'Tablet';
      case 'kiosk': return 'Kiosk';
      default: return type;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Sistem Ayarları</h1>
        <p className="page-subtitle">{t.tenantLabel} yapılandırması, lokasyonlar ve POS terminalleri</p>
      </div>

      {/* Tabs Menu */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 24, 
        borderBottom: '1px solid var(--border)',
        paddingBottom: 8,
        overflowX: 'auto'
      }}>
        <button
          className={`btn ${activeTab === 'info' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('info')}
          style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13 }}
        >
          <Building2 size={16} /> {t.tenantLabel} Bilgileri
        </button>
        <button
          className={`btn ${activeTab === 'locations' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('locations')}
          style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13 }}
        >
          <MapPin size={16} /> Hizmet Noktaları (Lokasyonlar)
        </button>
        <button
          className={`btn ${activeTab === 'devices' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('devices')}
          style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13 }}
        >
          <Smartphone size={16} /> POS Cihazları
        </button>
        <button
          className={`btn ${activeTab === 'billing' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('billing')}
          style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13 }}
        >
          <ShieldCheck size={16} /> Abonelik ve Lisans
        </button>
      </div>

      <div style={{ maxWidth: 800 }}>
        
        {/* Tab 1: Otel Bilgileri */}
        {activeTab === 'info' && (
          <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} style={{ color: 'var(--accent)' }} />
              Kurumsal {t.tenantLabel} Profili
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label className="input-label">{t.tenantLabel} Adı</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">İşletme Tipi</label>
                  <select className="input" value={businessType} onChange={(e) => setBusinessType(e.target.value as any)}>
                    <option value="hotel">Otel / Konaklama</option>
                    <option value="entertainment">Eğlence Merkezi / Diğer</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="input-label">Resmi E-posta</label>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">İletişim Telefonu</label>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="input-label">Adres Tarifi</label>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="input-label">Varsayılan Para Birimi</label>
                  <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="TRY">₺ TRY (Türk Lirası)</option>
                    <option value="EUR">€ EUR (Euro)</option>
                    <option value="USD">$ USD (Amerikan Doları)</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Saat Dilimi</label>
                  <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="Europe/Istanbul">İstanbul (GMT+3)</option>
                    <option value="Europe/Berlin">Berlin (GMT+1)</option>
                    <option value="Europe/London">Londra (GMT)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="input-label">{t.depositLabel} Tutarı (₺)</label>
                  <input className="input" type="number" min="0" step="any" placeholder="0" value={depositAmount || ''} onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)} />
                  <small style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4, display: 'block' }}>0 = depozito alınmaz. Giriş sırasında otomatik tahsil edilir.</small>
                </div>
                <div>
                  <label className="input-label">{t.dailyLimitLabel} (₺)</label>
                  <input className="input" type="number" min="0" step="any" placeholder="0" value={dailySpendingLimit || ''} onChange={(e) => setDailySpendingLimit(parseFloat(e.target.value) || 0)} />
                  <small style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4, display: 'block' }}>0 = sınırsız. Kart başına günlük üst harcama limiti.</small>
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleSaveInfo} disabled={saving} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? '✓ Kaydedildi' : <><Save size={16} /> Değişiklikleri Kaydet</>}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Hizmet Noktaları */}
        {activeTab === 'locations' && (
          <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={18} style={{ color: 'var(--success)' }} />
              Satış Hizmet Noktaları
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16, marginTop: -12 }}>
              POS el terminallerinin işlem yapacağı hizmet birimlerini (Restoran, Bar, Spa vb.) buradan yönetebilirsiniz.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                className="input"
                placeholder="Lokasyon adı (ör: Plaj Bar)"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-success" onClick={addLocation} disabled={!newLocName}>
                <Plus size={16} /> Ekle
              </button>
            </div>

            {locations.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Henüz hiçbir hizmet noktası tanımlanmamış.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {locations.map((loc) => (
                  <div key={loc.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(30,41,59,0.3)',
                    borderRadius: 12,
                    border: '1px solid rgba(51,65,85,0.4)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MapPin size={16} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{loc.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>({loc.slug})</span>
                    </div>
                    <button 
                      onClick={() => deleteLocation(loc.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                      disabled={loc.slug === 'reception'} // Protection for default reception desk
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: POS Terminalleri */}
        {activeTab === 'devices' && (
          <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={18} style={{ color: 'var(--accent)' }} />
              Kayıtlı POS Cihazları
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16, marginTop: -12 }}>
              {t.tenantLabelPossessive} tanımlı lisanslı el terminalleri, tablet ve kiosk cihazları. Güvenlik için sadece kayıtlı cihazlar sisteme bağlanabilir.
            </p>

            {/* Register New Device Form */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase' }}>Yeni POS Cihazı Kaydet</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div>
                  <label className="input-label" style={{ fontSize: 11 }}>Cihaz Adı</label>
                  <input className="input" placeholder="Havuz Bar El Terminali" value={newDevName} onChange={(e) => setNewDevName(e.target.value)} style={{ height: 38 }} />
                </div>
                <div>
                  <label className="input-label" style={{ fontSize: 11 }}>Cihaz Tipi</label>
                  <select className="input" value={newDevType} onChange={(e) => setNewDevType(e.target.value as any)} style={{ height: 38 }}>
                    <option value="handheld">El Terminali (Android)</option>
                    <option value="tablet">Lobi Tablet</option>
                    <option value="desktop">Masaüstü Bilgisayar</option>
                    <option value="kiosk">Self-Service Kiosk</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div>
                  <label className="input-label" style={{ fontSize: 11 }}>Hardware ID / MAC (Boşsa otomatik üretilir)</label>
                  <input className="input" placeholder="MAC-90-AB-CD..." value={newDevHardwareId} onChange={(e) => setNewDevHardwareId(e.target.value)} style={{ height: 38 }} />
                </div>
                <div>
                  <label className="input-label" style={{ fontSize: 11 }}>Atanacak Hizmet Noktası</label>
                  <select className="input" value={newDevLoc} onChange={(e) => setNewDevLoc(e.target.value)} style={{ height: 38 }}>
                    <option value="">Lokasyon Bağımsız</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="btn btn-primary" onClick={addDevice} disabled={!newDevName || devSaving} style={{ alignSelf: 'flex-start', height: 38, marginTop: 4 }}>
                {devSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Cihazı Yetkilendir
              </button>
            </div>

            {/* List of Devices */}
            {devices.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Kayıtlı POS cihazı bulunmuyor.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {devices.map((dev) => (
                  <div key={dev.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: 'rgba(30,41,59,0.3)',
                    borderRadius: 16,
                    border: '1px solid rgba(51,65,85,0.4)',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--accent)'
                      }}>
                        <Cpu size={18} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{dev.device_name}</span>
                          <span style={{ fontSize: 10, color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                            {getDeviceTypeLabel(dev.device_type)}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          Hardware ID: <span style={{ fontFamily: 'monospace', color: 'var(--accent-light)' }}>{dev.hardware_id}</span>
                          {dev.assigned_location && ` • Bölge: ${dev.assigned_location}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Active Toggle Switch */}
                      <button
                        onClick={() => toggleDeviceActive(dev)}
                        className={`btn btn-sm ${dev.is_active ? 'btn-success' : 'btn-ghost'}`}
                        style={{ fontSize: 11, padding: '4px 10px', height: 'auto' }}
                      >
                        {dev.is_active ? 'Yetkili / Aktif' : 'Askıda / Pasif'}
                      </button>

                      {/* Delete */}
                      <button 
                        onClick={() => deleteDevice(dev.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Abonelik ve Lisans */}
        {activeTab === 'billing' && (
          <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
              Lisans ve Abonelik Bilgileri
            </h3>
            
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              marginBottom: 20
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Lisans Modeli / Paket</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: tenant?.subscription_plan === 'premium' 
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05))'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))',
                      border: tenant?.subscription_plan === 'premium' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: tenant?.subscription_plan === 'premium' ? 'var(--accent-light)' : 'var(--muted)',
                      textTransform: 'uppercase'
                    }}>
                      {tenant?.subscription_plan === 'premium' ? 'Premium Paket' : tenant?.subscription_plan === 'basic' ? 'Standart Paket' : 'Lisans Yok'}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Lisans Bitiş Tarihi</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {tenant?.subscription_expires_at 
                      ? new Date(tenant.subscription_expires_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'var(--border)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>Lisans Durumu</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: tenant?.status === 'active' ? 'var(--success)' : 'var(--danger)' }}>
                    {tenant?.status === 'active' ? '● Aktif ve Yetkili' : '● Askıya Alındı'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>Kalan Süre</div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    marginTop: 4,
                    textAlign: 'right',
                    color: (() => {
                      const days = tenant?.subscription_expires_at ? Math.ceil((new Date(tenant.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                      return days > 5 ? 'var(--success)' : days > 0 ? 'var(--warning)' : 'var(--danger)';
                    })()
                  }}>
                    {(() => {
                      const days = tenant?.subscription_expires_at ? Math.ceil((new Date(tenant.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                      return days > 0 ? `${days} Gün Kaldı` : 'Süresi Doldu!';
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
              borderRadius: 16,
              padding: 16,
              fontSize: 13,
              lineHeight: '1.5',
              color: 'var(--muted)'
            }}>
              <h4 style={{ color: 'var(--accent-light)', fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Lisans & Donanım Talepleri</h4>
              Sistem lisans yenilemeleri, donanım siparişleri, ek RFID kart/POS terminali talepleriniz ve diğer teknik destek işlemleri için lütfen firma satış veya destek birimiyle iletişime geçiniz.
              
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <div>• <strong>{t.tenantLabel} Referans ID:</strong> <code style={{ color: 'var(--accent-light)' }}>{tenant?.id}</code></div>
                <div>• <strong>İletişim E-posta:</strong> <a href="mailto:destek@hotelpos.com" style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>destek@hotelpos.com</a></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
