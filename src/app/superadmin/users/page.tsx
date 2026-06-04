'use client';

import React, { useEffect, useState } from 'react';
import {
  Users, Search, Loader2, Edit2, Trash2, X, Save,
  ShieldAlert, CheckCircle, XCircle, Plus, Shield, Building2
} from 'lucide-react';
import { createClient } from '../../../utils/supabase';
import { Profile, Tenant } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';

export default function SuperadminUsersPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [users, setUsers] = useState<Profile[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState(''); // Only for new users
  const [formRole, setFormRole] = useState<string>('super_admin');
  const [formTenantId, setFormTenantId] = useState<string>('');
  const [formActive, setFormActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsersAndTenants = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch tenants list
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*')
        .order('name');
      setTenants(tenantsData || []);

      // 2. Fetch profiles list
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(profilesData || []);
    } catch (err: any) {
      console.error('Error fetching users/tenants:', err);
      toast({ message: 'Veriler yüklenirken hata oluştu.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndTenants();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('demo1234'); // Default password for convenience
    setFormRole('super_admin');
    setFormTenantId('');
    setFormActive(true);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (profile: Profile) => {
    setEditingUser(profile);
    setFormName(profile.full_name);
    setFormEmail(profile.email);
    setFormPassword('');
    setFormRole(profile.role);
    setFormTenantId(profile.tenant_id || '');
    setFormActive(profile.is_active ?? true);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formEmail) {
      setFormError('Ad Soyad ve E-posta alanları zorunludur.');
      return;
    }
    
    // If not super admin / platform owner, tenant must be selected
    if (formRole !== 'super_admin' && formRole !== 'platform_owner' && !formTenantId) {
      setFormError('Platform Yöneticisi veya Sahibi dışındaki roller için bir Tesis/İşletme seçilmelidir.');
      return;
    }

    setFormSaving(true);
    setFormError(null);

    try {
      const selectedTenantId = (formRole === 'super_admin' || formRole === 'platform_owner') ? null : formTenantId;

      if (editingUser) {
        // Edit existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formName,
            email: formEmail,
            role: formRole,
            tenant_id: selectedTenantId,
            is_active: formActive
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        toast({ message: 'Kullanıcı başarıyla güncellendi!', type: 'success' });
      } else {
        // Create new user profile
        // Note: In mock mode, this will also create the credentials locally.
        // In real mode, it writes directly to profiles (in a real production flow, admin triggers Edge Function to create Auth user).
        const newUserId = `mock-user-${Math.random().toString(36).substr(2, 9)}`;
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: newUserId,
            tenant_id: selectedTenantId,
            full_name: formName,
            email: formEmail,
            role: formRole,
            is_active: formActive
          });

        if (error) throw error;
        toast({ message: 'Yeni kullanıcı başarıyla eklendi!', type: 'success' });
      }

      setShowModal(false);
      fetchUsersAndTenants();
      window.dispatchEvent(new CustomEvent('rfid-db-updated'));
    } catch (err: any) {
      setFormError(err.message || 'Kullanıcı kaydedilirken bir hata oluştu.');
      toast({ message: `Hata: ${err.message || 'İşlem başarısız!'}`, type: 'error' });
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kullanıcıyı sistemden tamamen silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast({ message: 'Kullanıcı sistemden silindi.', type: 'warning' });
      fetchUsersAndTenants();
      window.dispatchEvent(new CustomEvent('rfid-db-updated'));
    } catch (err: any) {
      toast({ message: `Hata: ${err.message || 'Silme işlemi başarısız!'}`, type: 'error' });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'platform_owner':
        return <span className="badge" style={{ backgroundColor: '#7c3aed', color: 'white', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Shield size={10} /> Platform Sahibi</span>;
      case 'super_admin':
        return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Shield size={10} /> Platform Yöneticisi</span>;
      case 'hotel_admin':
        return <span className="badge badge-warning">İşletme Admini</span>;
      case 'manager':
        return <span className="badge badge-primary">İşletme Müdürü</span>;
      case 'receptionist':
        return <span className="badge badge-accent">Resepsiyon / Kasa</span>;
      case 'cashier':
        return <span className="badge badge-success">Kasiyer</span>;
      case 'waiter':
        return <span className="badge badge-muted">Garson</span>;
      default:
        return <span className="badge badge-muted">{role}</span>;
    }
  };

  const filtered = users.filter(u =>
    ['platform_owner', 'super_admin', 'hotel_admin', 'manager'].includes(u.role) && (
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">İşletme ve Sistem Yönetimi</h1>
          <p className="page-subtitle">SaaS platformunu yöneten Platform Sahiplerini (Platform Owner) ve işletmeleri yöneten İşletme Yöneticilerini (İşletme Admini, İşletme Müdürü) yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Yeni Yönetici Ekle
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            className="input"
            placeholder="İsim, e-posta veya rol ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Kullanıcılar Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>{search ? 'Arama sonucu bulunamadı.' : 'Sistemde kayıtlı kullanıcı bulunamadı.'}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kullanıcı Bilgileri</th>
                  <th>Rol / Yetki</th>
                  <th>Bağlı Tesis / İşletme</th>
                  <th>Durum</th>
                  <th>Son Giriş</th>
                  <th>Kayıt Tarihi</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const userTenant = tenants.find(t => t.id === user.tenant_id);
                  return (
                    <tr key={user.id} className="table-row-hover">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: user.role === 'platform_owner'
                              ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                              : user.role === 'super_admin'
                              ? 'linear-gradient(135deg, var(--danger), #dc2626)'
                              : 'linear-gradient(135deg, var(--accent), #4f46e5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 600, color: 'white', flexShrink: 0,
                          }}>
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{user.full_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td>
                        {user.role === 'platform_owner' ? (
                          <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Shield size={12} /> Sistem / Platform Owner
                          </span>
                        ) : user.role === 'super_admin' ? (
                          <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Shield size={12} /> Sistem / Platform Yöneticisi
                          </span>
                        ) : userTenant ? (
                          <span style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Building2 size={12} style={{ color: 'var(--muted)' }} />
                            {userTenant.name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>— Tanımsız İşletme —</span>
                        )}
                      </td>
                      <td>
                        {user.is_active ?? true ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={10} /> Aktif
                          </span>
                        ) : (
                          <span className="badge badge-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <XCircle size={10} /> Pasif
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleString('tr-TR') : 'Hiç giriş yapmadı'}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--muted)' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(user)} title="Kullanıcıyı Düzenle">
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => handleDelete(user.id)} 
                            style={{ color: 'var(--danger)' }}
                            title="Kullanıcıyı Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Sistem Kullanıcısı Ekle'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label">Ad Soyad</label>
                <input className="input" placeholder="Ad Soyad giriniz..." value={formName} onChange={(e) => setFormName(e.target.value)} required />
              </div>
              
              <div>
                <label className="input-label">E-posta Adresi</label>
                <input 
                  className="input" 
                  type="email" 
                  placeholder="ornek@hotelpos.com" 
                  value={formEmail} 
                  onChange={(e) => setFormEmail(e.target.value)}
                  disabled={!!editingUser}
                  required
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="input-label">Giriş Şifresi</label>
                  <input 
                    className="input" 
                    type="text" 
                    placeholder="Şifre belirleyin..." 
                    value={formPassword} 
                    onChange={(e) => setFormPassword(e.target.value)}
                  />
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    * Mock modunda bu kullanıcının giriş yapabilmesi için demo şifresi varsayılan olarak `demo1234` yapılmıştır.
                  </span>
                </div>
              )}

              <div>
                <label className="input-label">Rol / Yetki Derecesi</label>
                <select 
                  className="input" 
                  value={formRole} 
                  onChange={(e) => {
                    const selectedRole = e.target.value;
                    setFormRole(selectedRole);
                    if (selectedRole === 'super_admin' || selectedRole === 'platform_owner') {
                      setFormTenantId('');
                    } else if (tenants.length > 0 && !formTenantId) {
                      setFormTenantId(tenants[0].id);
                    }
                  }}
                >
                  <option value="platform_owner">👑 Platform Sahibi (Platform Owner)</option>
                  <option value="super_admin">🛡️ Platform Yöneticisi (Super Admin)</option>
                  <option value="hotel_admin">🏢 İşletme Admini / Sahibi</option>
                  <option value="manager">💼 İşletme Müdürü</option>
                </select>
              </div>

              {formRole !== 'super_admin' && formRole !== 'platform_owner' && (
                <div>
                  <label className="input-label">Bağlı Olduğu Tesis / İşletme</label>
                  <select 
                    className="input" 
                    value={formTenantId} 
                    onChange={(e) => setFormTenantId(e.target.value)}
                  >
                    <option value="" disabled>Lütfen bir tesis seçin...</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (Slug: {t.slug})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input 
                  type="checkbox" 
                  id="formActive" 
                  checked={formActive} 
                  onChange={(e) => setFormActive(e.target.checked)} 
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="formActive" style={{ fontSize: 13, fontWeight: 550, cursor: 'pointer' }}>
                  Kullanıcı Hesabı Aktif (Sisteme giriş yapabilir)
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={formSaving} style={{ flex: 1 }}>
                {formSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingUser ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
