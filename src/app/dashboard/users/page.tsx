'use client';

import React, { useEffect, useState } from 'react';
import {
  UserCheck, Plus, Search, Edit2, Trash2, Loader2, X, Save, ShieldAlert, CheckCircle, XCircle
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { createClient } from '../../../utils/supabase';
import { Profile } from '../../../types';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../contexts/ToastContext';

export default function UsersPage() {
  const { tenant } = useAuth();
  const supabase = createClient();
  const t = useTerminology();
  const { toast } = useToast();

  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'manager' | 'receptionist' | 'waiter' | 'cashier'>('waiter');
  const [formActive, setFormActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);

    try {
      // Query profiles for this tenant
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('full_name');

      if (error) throw error;
      // Exclude super admins if any returned
      const filteredUsers = (data || []).filter((p: any) => p.role !== 'super_admin');
      setUsers(filteredUsers);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [tenant?.id]);

  const openAddModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole('waiter');
    setFormActive(true);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (profile: Profile) => {
    setEditingUser(profile);
    setFormName(profile.full_name);
    setFormEmail(profile.email);
    setFormRole(profile.role as any);
    setFormActive(profile.is_active ?? true);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!tenant?.id) return;
    if (!formName || !formEmail) {
      setFormError('İsim ve E-posta alanları zorunludur.');
      return;
    }
    setFormSaving(true);
    setFormError(null);

    try {
      if (editingUser) {
        // Update profile
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formName,
            email: formEmail,
            role: formRole,
            is_active: formActive
          })
          .eq('id', editingUser.id);
        if (error) throw error;
        toast({ message: 'Personel başarıyla güncellendi!', type: 'success' });
      } else {
        // Insert new profile (in mock mode, this adds local user, in real supabase it creates db profile)
        const { error } = await supabase
          .from('profiles')
          .insert({
            tenant_id: tenant.id,
            full_name: formName,
            email: formEmail,
            role: formRole,
            is_active: formActive
          });
        if (error) throw error;
        toast({ message: 'Personel başarıyla kaydedildi!', type: 'success' });
      }
      setShowModal(false);
      fetchUsers();
      window.dispatchEvent(new CustomEvent('rfid-db-updated'));
    } catch (err: any) {
      setFormError(err.message || 'Kayıt sırasında hata oluştu.');
      toast({ message: `Hata: ${err.message || 'Kayıt başarısız!'}`, type: 'error' });
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu personeli silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast({ message: 'Personel silindi.', type: 'warning' });
      fetchUsers();
      window.dispatchEvent(new CustomEvent('rfid-db-updated'));
    } catch (err: any) {
      toast({ message: `Hata: ${err.message || 'Silme işlemi başarısız!'}`, type: 'error' });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'hotel_admin':
        return <span className="badge badge-danger">Yönetici</span>;
      case 'manager':
        return <span className="badge badge-warning">Müdür</span>;
      case 'receptionist':
        return <span className="badge badge-accent">{t.receptionLabel} Görevlisi</span>;
      case 'cashier':
        return <span className="badge badge-success">Kasiyer</span>;
      case 'waiter':
        default:
        return <span className="badge badge-muted">Garson</span>;
    }
  };

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Personel Yönetimi</h1>
          <p className="page-subtitle">{users.length} personel tanımlı</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Yeni Personel Ekle
        </button>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            className="input"
            placeholder="İsim veya e-posta ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <UserCheck size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>{search ? 'Sonuç bulunamadı' : 'Henüz personel tanımlanmamış'}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>E-posta Adresi</th>
                  <th>Rol / Yetki</th>
                  <th>Durum</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 600, color: 'white', flexShrink: 0,
                        }}>
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{user.full_name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--muted)' }}>{user.email}</td>
                    <td>{getRoleBadge(user.role)}</td>
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
                    <td style={{ textAlign: 'right' }}>
                      {/* Admin users cannot delete themselves or change their role to prevent lockouts */}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(user)}>
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => handleDelete(user.id)} 
                          style={{ color: 'var(--danger)' }}
                          disabled={user.role === 'hotel_admin'}
                          title={user.role === 'hotel_admin' ? `${t.tenantLabel} sahibi silinemez` : ''}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CRUD Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                {editingUser ? 'Personel Düzenle' : 'Yeni Personel Tanımla'}
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
                <label className="input-label">Personel Adı Soyadı</label>
                <input className="input" placeholder="Canan Demir" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              
              <div>
                <label className="input-label">E-posta Adresi</label>
                <input 
                  className="input" 
                  type="email" 
                  placeholder="personel@hotel.com" 
                  value={formEmail} 
                  onChange={(e) => setFormEmail(e.target.value)}
                  disabled={!!editingUser} // Email change restricted for consistency
                />
              </div>

              <div>
                <label className="input-label">Rol / Yetki Derecesi</label>
                <select 
                  className="input" 
                  value={formRole} 
                  onChange={(e) => setFormRole(e.target.value as any)}
                  disabled={editingUser?.role === 'hotel_admin'}
                >
                  <option value="manager">Müdür (Tüm Raporlar + Ayarlar)</option>
                  <option value="receptionist">{t.receptionLabel} Görevlisi (Kart & Bakiye Yönetimi)</option>
                  <option value="cashier">Kasiyer (POS Satış & İadeler)</option>
                  <option value="waiter">Garson (Sadece POS Satış Yetkisi)</option>
                </select>
                {editingUser?.role === 'hotel_admin' && (
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                    {t.tenantLabel} kurucusunun yönetici yetkileri değiştirilemez.
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input 
                  type="checkbox" 
                  id="formActive" 
                  checked={formActive} 
                  onChange={(e) => setFormActive(e.target.checked)} 
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                  disabled={editingUser?.role === 'hotel_admin'}
                />
                <label htmlFor="formActive" style={{ fontSize: 13, fontWeight: 550, cursor: 'pointer' }}>
                  Personel Hesabı Aktif (Sisteme giriş yapabilir)
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
