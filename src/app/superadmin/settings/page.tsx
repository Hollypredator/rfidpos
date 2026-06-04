'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, Building2, Mail, Shield, Save, RefreshCw, 
  CheckCircle, Globe, HardDrive, Eye, Lock
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';

interface PlatformSettings {
  companyName: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  defaultCurrency: string;
  defaultTimezone: string;
  defaultBusinessType: 'hotel' | 'entertainment';
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpSender: string;
  sessionTimeout: number;
  ipRestriction: string;
  allowSelfRegister: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  companyName: 'RFID POS A.Ş.',
  logoUrl: '',
  contactEmail: 'destek@rfidpos.com',
  contactPhone: '+90 (850) 555 0 555',
  defaultCurrency: 'TRY',
  defaultTimezone: 'Europe/Istanbul',
  defaultBusinessType: 'hotel',
  smtpHost: 'smtp.rfidpos.com',
  smtpPort: '587',
  smtpUser: 'notifications@rfidpos.com',
  smtpPass: '••••••••••••',
  smtpSender: 'RFID POS Bildirimleri <noreply@rfidpos.com>',
  sessionTimeout: 60,
  ipRestriction: '',
  allowSelfRegister: false,
};

export default function SuperadminSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'defaults' | 'smtp' | 'security'>('general');
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('rfid_platform_settings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
    }
  }, []);

  const handleChange = (key: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      localStorage.setItem('rfid_platform_settings', JSON.stringify(settings));
      // Dispatch event so other parts of the app can react if needed
      window.dispatchEvent(new CustomEvent('rfid-settings-updated', { detail: settings }));
      toast({ message: 'Sistem ayarları başarıyla kaydedildi.', type: 'success' });
    } catch (err) {
      toast({ message: 'Ayarlar kaydedilirken bir hata oluştu.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Tüm ayarları varsayılan fabrika ayarlarına döndürmek istediğinize emin misiniz?')) {
      setSettings(DEFAULT_SETTINGS);
      toast({ message: 'Ayarlar varsayılana sıfırlandı. Kaydetmeyi unutmayın.', type: 'warning' });
    }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Sistem Ayarları</h1>
          <p className="page-subtitle">SaaS platformunun küresel varsayılanlarını, şirket bilgilerini, SMTP e-posta sunucusunu ve güvenlik politikalarını yönetin.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Navigation Tabs (Vertical Sidebar layout inside settings) */}
        <div className="glass-card" style={{ width: '100%', maxWidth: 220, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            className={`sidebar-link ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
              background: activeTab === 'general' ? 'var(--accent-glow)' : 'transparent', border: 'none',
              borderLeft: activeTab === 'general' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'general' ? 'var(--foreground)' : 'var(--muted)',
              borderRadius: 'var(--radius-sm)', textAlign: 'left', fontSize: 13, fontWeight: activeTab === 'general' ? 600 : 500, cursor: 'pointer'
            }}
          >
            <Building2 size={16} />
            <span>Platform Bilgileri</span>
          </button>
          
          <button
            className={`sidebar-link ${activeTab === 'defaults' ? 'active' : ''}`}
            onClick={() => setActiveTab('defaults')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
              background: activeTab === 'defaults' ? 'var(--accent-glow)' : 'transparent', border: 'none',
              borderLeft: activeTab === 'defaults' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'defaults' ? 'var(--foreground)' : 'var(--muted)',
              borderRadius: 'var(--radius-sm)', textAlign: 'left', fontSize: 13, fontWeight: activeTab === 'defaults' ? 600 : 500, cursor: 'pointer'
            }}
          >
            <Globe size={16} />
            <span>Varsayılan Ayarlar</span>
          </button>

          <button
            className={`sidebar-link ${activeTab === 'smtp' ? 'active' : ''}`}
            onClick={() => setActiveTab('smtp')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
              background: activeTab === 'smtp' ? 'var(--accent-glow)' : 'transparent', border: 'none',
              borderLeft: activeTab === 'smtp' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'smtp' ? 'var(--foreground)' : 'var(--muted)',
              borderRadius: 'var(--radius-sm)', textAlign: 'left', fontSize: 13, fontWeight: activeTab === 'smtp' ? 600 : 500, cursor: 'pointer'
            }}
          >
            <Mail size={16} />
            <span>SMTP Sunucu</span>
          </button>

          <button
            className={`sidebar-link ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
              background: activeTab === 'security' ? 'var(--accent-glow)' : 'transparent', border: 'none',
              borderLeft: activeTab === 'security' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'security' ? 'var(--foreground)' : 'var(--muted)',
              borderRadius: 'var(--radius-sm)', textAlign: 'left', fontSize: 13, fontWeight: activeTab === 'security' ? 600 : 500, cursor: 'pointer'
            }}
          >
            <Shield size={16} />
            <span>Güvenlik Politikası</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="glass-card" style={{ flex: 1, minWidth: 280, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {activeTab === 'general' && (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>Platform / İşletme Sahibi Bilgileri</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Firma Adı</label>
                  <input
                    className="input"
                    value={settings.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Şirket ismini yazın..."
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Destek E-postası</label>
                  <input
                    className="input"
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    placeholder="destek@firma.com"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">İletişim Telefonu</label>
                  <input
                    className="input"
                    value={settings.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    placeholder="+90 (---) --- -- --"
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Logo URL</label>
                  <input
                    className="input"
                    value={settings.logoUrl}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    Boş bırakılırsa varsayılan platform logosu gösterilecektir.
                  </span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'defaults' && (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>Yeni İşletme Kayıt Varsayılanları</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="input-label">Varsayılan Para Birimi</label>
                  <select
                    className="input"
                    value={settings.defaultCurrency}
                    onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                  >
                    <option value="TRY">Türk Lirası (TRY)</option>
                    <option value="USD">Amerikan Doları (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">İngiliz Sterlini (GBP)</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Varsayılan Zaman Dilimi</label>
                  <select
                    className="input"
                    value={settings.defaultTimezone}
                    onChange={(e) => handleChange('defaultTimezone', e.target.value)}
                  >
                    <option value="Europe/Istanbul">Europe/Istanbul (GMT+3)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                    <option value="Europe/London">Europe/London (GMT+0 / GMT+1)</option>
                    <option value="America/New_York">America/New_York (GMT-5)</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Varsayılan İşletme Türü</label>
                  <select
                    className="input"
                    value={settings.defaultBusinessType}
                    onChange={(e) => handleChange('defaultBusinessType', e.target.value)}
                  >
                    <option value="hotel">Otel (Oda/Bileklik Cüzdan)</option>
                    <option value="entertainment">Eğlence Merkezi (Müşteri Kart/Bileklik)</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <input
                    type="checkbox"
                    id="allowSelfRegister"
                    checked={settings.allowSelfRegister}
                    onChange={(e) => handleChange('allowSelfRegister', e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <label htmlFor="allowSelfRegister" style={{ fontSize: 13, fontWeight: 550, cursor: 'pointer' }}>
                    Web sitesi üzerinden dışarıdan yeni işletme kaydına izin ver (Açık Kayıt)
                  </label>
                </div>
              </div>
            </>
          )}

          {activeTab === 'smtp' && (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>SMTP E-posta Yapılandırması</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Gönderen Adı & Adresi (Sender Label)</label>
                  <input
                    className="input"
                    value={settings.smtpSender}
                    onChange={(e) => handleChange('smtpSender', e.target.value)}
                    placeholder="RFID POS <noreply@rfidpos.com>"
                    required
                  />
                </div>
                <div style={{ gridColumn: '80%' }}>
                  <label className="input-label">SMTP Sunucu Host Adresi</label>
                  <input
                    className="input"
                    value={settings.smtpHost}
                    onChange={(e) => handleChange('smtpHost', e.target.value)}
                    placeholder="mail.firma.com veya smtp.gmail.com"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">SMTP Portu</label>
                  <input
                    className="input"
                    value={settings.smtpPort}
                    onChange={(e) => handleChange('smtpPort', e.target.value)}
                    placeholder="587 veya 465"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">SMTP Kullanıcı Adı (Email)</label>
                  <input
                    className="input"
                    value={settings.smtpUser}
                    onChange={(e) => handleChange('smtpUser', e.target.value)}
                    placeholder="noreply@firma.com"
                    required
                  />
                </div>
                <div>
                  <label className="input-label">SMTP Şifresi</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      value={settings.smtpPass}
                      onChange={(e) => handleChange('smtpPass', e.target.value)}
                      placeholder="Şifrenizi yazın..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer'
                      }}
                    >
                      <Lock size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>Güvenlik & Erişim Politikaları</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="input-label">Maksimum Oturum Süresi (Dakika)</label>
                  <input
                    className="input"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value) || 60)}
                    min={5}
                    max={1440}
                    required
                  />
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    Kullanıcılar belirtilen süre boyunca işlem yapmazsa otomatik olarak oturumdan çıkarılır.
                  </span>
                </div>
                <div>
                  <label className="input-label">Superadmin IP Kısıtlamaları (IP Whitelisting)</label>
                  <input
                    className="input"
                    value={settings.ipRestriction}
                    onChange={(e) => handleChange('ipRestriction', e.target.value)}
                    placeholder="Virgülle ayırın, örn: 192.168.1.1, 85.105.x.x"
                  />
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    Sadece belirtilen IP adreslerinden superadmin paneline erişime izin verilir. Boş bırakılırsa tüm IP'lere izin verilir.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 18, justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleReset}
              style={{ color: 'var(--muted)' }}
            >
              Fabrika Ayarlarına Dön
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 100 }}
            >
              {isSaving ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
