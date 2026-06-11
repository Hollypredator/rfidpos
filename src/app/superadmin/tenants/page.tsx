'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2, Search, Loader2, Edit2, Trash2, X, Save,
  Shield, Ban, CheckCircle, DoorOpen, Users, ArrowLeftRight,
  Eye, Plus, Smartphone, Sparkles, Calendar, Globe, Trash
} from 'lucide-react';
import { createClient } from '../../../utils/supabase';
import { Tenant, Room, Device, Location, Transaction } from '../../../types';

export default function TenantsPage() {
  const supabase = createClient();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'devices' | 'txns' | 'edit' | 'history'>('overview');

  // Tenant Details States
  const [detailRooms, setDetailRooms] = useState<Room[]>([]);
  const [detailLocations, setDetailLocations] = useState<Location[]>([]);
  const [detailDevices, setDetailDevices] = useState<Device[]>([]);
  const [detailTransactions, setDetailTransactions] = useState<Transaction[]>([]);
  const [detailGuests, setDetailGuests] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit Form
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<string>('active');
  const [formPlan, setFormPlan] = useState<string>('none');
  const [formExpiresAt, setFormExpiresAt] = useState<string>('');
  const [formBusinessType, setFormBusinessType] = useState<'hotel' | 'entertainment'>('hotel');
  const [formAdminNotes, setFormAdminNotes] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Form
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addStatus, setAddStatus] = useState<any>('inactive');
  const [addPlan, setAddPlan] = useState<string>('none');
  const [addExpiresAt, setAddExpiresAt] = useState<string>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });
  const [addCurrency, setAddCurrency] = useState('TRY');
  const [addTimezone, setAddTimezone] = useState('Europe/Istanbul');
  const [addBusinessType, setAddBusinessType] = useState<'hotel' | 'entertainment'>('hotel');

  // Stats
  const [tenantStats, setTenantStats] = useState<Record<string, { rooms: number; txns: number; totalBalance: number }>>({});

  const fetchTenants = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    const tenantList = data || [];
    setTenants(tenantList);

    // Fetch details stats for each tenant
    if (tenantList.length > 0) {
      const statsMap: Record<string, { rooms: number; txns: number; totalBalance: number }> = {};
      for (const t of tenantList) {
        const { data: rooms } = await supabase.from('rooms').select('*').eq('tenant_id', t.id);
        const { count: txns } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id);
        
        const rCount = rooms?.length || 0;
        const balance = rooms?.reduce((sum: number, r: any) => sum + Number(r.wallet_balance), 0) || 0;
        
        statsMap[t.id] = { 
          rooms: rCount, 
          txns: txns || 0,
          totalBalance: balance
        };
      }
      setTenantStats(statsMap);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDetails = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setActiveTab('overview');
    setShowDetailsModal(true);
    setLoadingDetails(true);
    
    // Set edit form values just in case
    setFormName(tenant.name);
    setFormEmail(tenant.email || '');
    setFormPhone(tenant.phone || '');
    setFormStatus(tenant.status);
    setFormPlan(tenant.subscription_plan || 'none');
    setFormExpiresAt(tenant.subscription_expires_at ? tenant.subscription_expires_at.split('T')[0] : '');
    setFormBusinessType((tenant.settings as any)?.business_type || 'hotel');
    setFormAdminNotes((tenant.settings as any)?.admin_notes || '');
    setFormError(null);

    try {
      // Query related records dynamically
      const { data: rooms } = await supabase.from('rooms').select('*').eq('tenant_id', tenant.id).order('room_number');
      const { data: locations } = await supabase.from('locations').select('*').eq('tenant_id', tenant.id);
      const { data: devices } = await supabase.from('devices').select('*').eq('tenant_id', tenant.id);
      const { data: txs } = await supabase.from('transactions').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(6);

      // Fetch guests dynamically for occupied rooms
      const roomIds = rooms?.map((r: any) => r.id) || [];
      let guestsData: any[] = [];
      if (roomIds.length > 0) {
        const { data: guests } = await supabase.from('guests').select('*').in('room_id', roomIds);
        guestsData = guests || [];
      }

      setDetailRooms(rooms || []);
      setDetailLocations(locations || []);
      setDetailDevices(devices || []);
      setDetailTransactions(txs || []);
      setDetailGuests(guestsData);
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedTenant) return;
    setFormSaving(true);
    setFormError(null);

    try {
      const planChanged = selectedTenant.subscription_plan !== formPlan;
      const dateChanged = (selectedTenant.subscription_expires_at ? selectedTenant.subscription_expires_at.split('T')[0] : '') !== formExpiresAt;
      
      let updatedHistory = (selectedTenant.settings as any)?.subscription_history || [];
      if (planChanged || dateChanged) {
        updatedHistory = [
          {
            plan: formPlan,
            expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
            changed_at: new Date().toISOString(),
            by: 'Platform Yöneticisi',
            action: planChanged ? 'Plan Değişikliği' : 'Lisans Süresi Güncelleme'
          },
          ...updatedHistory
        ];
      }

      const updatedSettings = {
        ...(selectedTenant.settings || {}),
        business_type: formBusinessType,
        admin_notes: formAdminNotes,
        subscription_history: updatedHistory
      };

      const { error } = await supabase
        .from('tenants')
        .update({ 
          name: formName, 
          email: formEmail, 
          phone: formPhone, 
          status: formStatus,
          subscription_plan: formPlan,
          subscription_expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          settings: updatedSettings
        })
        .eq('id', selectedTenant.id);
      if (error) throw error;
      
      // Update local tenant object state
      setSelectedTenant({
        ...selectedTenant,
        name: formName,
        email: formEmail,
        phone: formPhone,
        status: formStatus as any,
        subscription_plan: formPlan,
        subscription_expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined,
        settings: updatedSettings
      });
      
      setShowDetailsModal(false);
      fetchTenants();
    } catch (err: any) {
      setFormError(err.message || 'Güncelleme hatası');
    } finally {
      setFormSaving(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!addName) {
      setFormError('İşletme adı zorunludur.');
      return;
    }
    setFormSaving(true);
    setFormError(null);

    try {
      const isEntertainment = addBusinessType === 'entertainment';
      const newTenantId = `tenant-${Math.random().toString(36).substr(2, 9)}`;
      const newTenant: Tenant = {
        id: newTenantId,
        name: addName,
        slug: addName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        email: addEmail,
        phone: addPhone,
        status: addStatus,
        currency: addCurrency,
        timezone: addTimezone,
        subscription_plan: addPlan,
        subscription_expires_at: addExpiresAt ? new Date(addExpiresAt).toISOString() : new Date(Date.now() - 1000).toISOString(),
        settings: { business_type: addBusinessType },
        created_at: new Date().toISOString()
      };

      // 1. Create Tenant
      const { error: tErr } = await supabase.from('tenants').insert(newTenant);
      if (tErr) throw tErr;

      // 2. Create Default Locations
      if (isEntertainment) {
        await supabase.from('locations').insert([
          { tenant_id: newTenantId, name: 'Danışma & Kasa', slug: 'reception', icon: 'Building', is_active: true },
          { tenant_id: newTenantId, name: 'VR Oyun Alanı', slug: 'vr-zone', icon: 'Gamepad2', is_active: true },
          { tenant_id: newTenantId, name: 'Trambolin Parkı', slug: 'trampoline', icon: 'Activity', is_active: true },
          { tenant_id: newTenantId, name: 'Kafe & Bar', slug: 'bar', icon: 'Coffee', is_active: true }
        ]);
      } else {
        await supabase.from('locations').insert([
          { tenant_id: newTenantId, name: 'Resepsiyon', slug: 'reception', icon: 'Building', is_active: true },
          { tenant_id: newTenantId, name: 'Restoran', slug: 'restaurant', icon: 'UtensilsCrossed', is_active: true },
          { tenant_id: newTenantId, name: 'Bar', slug: 'bar', icon: 'Wine', is_active: true },
          { tenant_id: newTenantId, name: 'Spa', slug: 'spa', icon: 'Sparkles', is_active: true }
        ]);
      }

      // 3. Create Default Rooms
      const defaultRoomsList = isEntertainment ? [
        { tenant_id: newTenantId, room_number: '201', wallet_balance: 500, pin_code: '1234', status: 'occupied' },
        { tenant_id: newTenantId, room_number: '202', wallet_balance: 150, pin_code: '4321', status: 'occupied' },
        { tenant_id: newTenantId, room_number: '203', wallet_balance: 0, pin_code: '0000', status: 'active' }
      ] : [
        { tenant_id: newTenantId, room_number: '101', wallet_balance: 1500, pin_code: '1234', status: 'occupied' },
        { tenant_id: newTenantId, room_number: '102', wallet_balance: 350, pin_code: '4321', status: 'occupied' },
        { tenant_id: newTenantId, room_number: '103', wallet_balance: 0, pin_code: '0000', status: 'active' }
      ];

      const { data: insertedRooms } = await supabase.from('rooms').insert(defaultRoomsList).select();

      // 4. Create Default Guests
      if (insertedRooms && Array.isArray(insertedRooms)) {
        const roomA = insertedRooms.find((r: any) => r.room_number === (isEntertainment ? '201' : '101'));
        const roomB = insertedRooms.find((r: any) => r.room_number === (isEntertainment ? '202' : '102'));
        
        const guestsToInsert = [];
        if (roomA) {
          guestsToInsert.push({ 
            tenant_id: newTenantId,
            room_id: roomA.id, 
            guest_name: isEntertainment ? 'Alp Eren' : 'Ahmet Yılmaz', 
            card_uid: `UID${Math.random().toString(36).substr(2, 6).toUpperCase()}`, 
            status: 'active' 
          });
        }
        if (roomB) {
          guestsToInsert.push({ 
            tenant_id: newTenantId,
            room_id: roomB.id, 
            guest_name: isEntertainment ? 'Selin Yılmaz' : 'Zeynep Kaya', 
            card_uid: `UID${Math.random().toString(36).substr(2, 6).toUpperCase()}`, 
            status: 'active' 
          });
        }
        if (guestsToInsert.length > 0) {
          await supabase.from('guests').insert(guestsToInsert);
        }
      }

      // Reset form
      setAddName('');
      setAddEmail('');
      setAddPhone('');
      setAddStatus('inactive');
      setAddPlan('none');
      setAddExpiresAt(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
      });
      setAddCurrency('TRY');
      setAddTimezone('Europe/Istanbul');
      setAddBusinessType('hotel');
      
      setShowAddModal(false);
      fetchTenants();
    } catch (err: any) {
      setFormError(err.message || 'Kayıt hatası');
    } finally {
      setFormSaving(false);
    }
  };

  const toggleSuspend = async (tenant: Tenant) => {
    const newStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    if (!confirm(`Bu işletmeyi ${newStatus === 'suspended' ? 'askıya almak' : 'aktifleştirmek'} istediğinize emin misiniz?`)) return;
    await supabase.from('tenants').update({ status: newStatus }).eq('id', tenant.id);
    fetchTenants();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu işletmeyi ve tüm verilerini (odalar/birimler, işlemler, lokasyonlar) kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    
    // In mock mode, we delete related records first
    await supabase.from('rooms').delete().eq('tenant_id', id);
    await supabase.from('locations').delete().eq('tenant_id', id);
    await supabase.from('devices').delete().eq('tenant_id', id);
    await supabase.from('transactions').delete().eq('tenant_id', id);
    await supabase.from('tenants').delete().eq('id', id);
    
    fetchTenants();
  };

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="badge badge-success">Aktif</span>;
      case 'inactive': return <span className="badge badge-muted">Pasif</span>;
      case 'suspended': return <span className="badge badge-danger">Askıda</span>;
      default: return <span className="badge badge-muted">{status}</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">İşletme Yönetimi</h1>
          <p className="page-subtitle">SaaS platformundaki aktif, pasif ve askıdaki tüm işletmeleri izleyin ve yönetin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(null); setShowAddModal(true); }}>
          <Plus size={16} /> Yeni İşletme Kaydı
        </button>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input className="input" placeholder="İşletme adı veya e-posta ara..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Building2 size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>İşletme bulunamadı</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>İşletme</th>
                <th>Odalar / Birimler</th>
                <th>Toplam Bakiye</th>
                <th>Toplam İşlem</th>
                <th>Durum</th>
                <th>Lisans / Kalan Gün</th>
                <th>Kayıt Tarihi</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="table-row-hover" style={{ cursor: 'pointer' }} onClick={() => handleOpenDetails(t)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={(e) => e.stopPropagation()}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: t.status === 'suspended'
                          ? 'linear-gradient(135deg, #4b5563, #374151)'
                          : 'linear-gradient(135deg, var(--accent), #4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 600, color: 'white', flexShrink: 0,
                      }} onClick={() => handleOpenDetails(t)}>
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ cursor: 'pointer' }} onClick={() => handleOpenDetails(t)}>
                        <div style={{ fontWeight: 500 }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.email || `${t.slug}.hotelpos.com`}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      <DoorOpen size={13} style={{ color: 'var(--muted)' }} />
                      {tenantStats[t.id]?.rooms || 0} oda
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 13 }}>
                    ₺{(tenantStats[t.id]?.totalBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      <ArrowLeftRight size={13} style={{ color: 'var(--muted)' }} />
                      {tenantStats[t.id]?.txns || 0} işlem
                    </span>
                  </td>
                  <td>{statusBadge(t.status)}</td>
                  <td>
                    {(() => {
                      const plan = t.subscription_plan || 'none';
                      const expires = t.subscription_expires_at;
                      if (!expires) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>;
                      
                      const days = Math.ceil((new Date(expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isExpired = days <= 0;
                      
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ 
                            fontSize: 12, 
                            fontWeight: 700, 
                            color: plan === 'premium' ? 'var(--accent-light)' : plan === 'basic' ? 'var(--success)' : 'var(--muted)',
                            textTransform: 'uppercase'
                          }}>
                            {plan === 'premium' ? '★ Premium' : plan === 'basic' ? 'Standart' : 'Yok'}
                          </span>
                          <span style={{ 
                            fontSize: 11, 
                            color: isExpired ? 'var(--danger)' : days <= 5 ? 'var(--warning)' : 'var(--muted)',
                            fontWeight: isExpired || days <= 5 ? 600 : 400
                          }}>
                            {isExpired ? 'Süresi Doldu' : `${days} gün kaldı`}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleOpenDetails(t)} title="Detayları Görüntüle">
                        <Eye size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleSuspend(t)}
                        title={t.status === 'suspended' ? 'Aktifleştir' : 'Askıya Al'}
                        style={{ color: t.status === 'suspended' ? 'var(--success)' : 'var(--warning)' }}>
                        {t.status === 'suspended' ? <CheckCircle size={14} /> : <Ban size={14} />}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t.id)} style={{ color: 'var(--danger)' }} title="İşletmeyi Sil">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* unified Drawer Details Modal */}
      {showDetailsModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" style={{ maxWidth: 720, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selectedTenant.name}</h3>
                  {statusBadge(selectedTenant.status)}
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  ID: <span style={{ fontFamily: 'monospace' }}>{selectedTenant.id}</span>
                </p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 20, overflowX: 'auto' }}>
              <button className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('overview')}>
                Genel Bakış
              </button>
              <button className={`btn btn-sm ${activeTab === 'rooms' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('rooms')}>
                {selectedTenant && (selectedTenant.settings as any)?.business_type === 'entertainment' ? `Kartlar & Bileklikler (${detailRooms.length})` : `Odalar (${detailRooms.length})`}
              </button>
              <button className={`btn btn-sm ${activeTab === 'devices' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('devices')}>
                Cihazlar & Lokasyonlar
              </button>
              <button className={`btn btn-sm ${activeTab === 'txns' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('txns')}>
                Son İşlemler
              </button>
              <button className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('history')}>
                Lisans Geçmişi
              </button>
              <button className={`btn btn-sm ${activeTab === 'edit' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('edit')}>
                İşletme Ayarlarını Düzenle
              </button>
            </div>

            {/* Loading details state */}
            {loadingDetails ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                Veriler yükleniyor...
              </div>
            ) : (
              <div style={{ minHeight: 280, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
                {/* Tab: Overview */}
                {activeTab === 'overview' && (
                  <div>
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                      <div className="stat-card accent" style={{ padding: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {selectedTenant && (selectedTenant.settings as any)?.business_type === 'entertainment' ? 'Kart & Bileklik' : 'Toplam Oda'}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{detailRooms.length}</div>
                      </div>
                      <div className="stat-card success" style={{ padding: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Toplam Bakiye</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                          ₺{detailRooms.reduce((sum, r) => sum + Number(r.wallet_balance), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="stat-card warning" style={{ padding: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Cihaz Sayısı</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{detailDevices.length}</div>
                      </div>
                    </div>

                    {/* Details Table */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>İletişim Bilgileri</div>
                        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '8px 0', color: 'var(--muted)' }}>E-posta:</td><td style={{ textAlign: 'right', fontWeight: 500 }}>{selectedTenant.email || 'Belirtilmemiş'}</td></tr>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '8px 0', color: 'var(--muted)' }}>Telefon:</td><td style={{ textAlign: 'right', fontWeight: 500 }}>{selectedTenant.phone || 'Belirtilmemiş'}</td></tr>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '8px 0', color: 'var(--muted)' }}>Alt Alan Adı:</td><td style={{ textAlign: 'right', fontWeight: 500, fontFamily: 'monospace' }}>{selectedTenant.slug}.hotelpos.com</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Yerelleştirme & Sistem</div>
                        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '8px 0', color: 'var(--muted)' }}>Para Birimi:</td><td style={{ textAlign: 'right', fontWeight: 500 }}>{selectedTenant.currency || 'TRY'}</td></tr>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '8px 0', color: 'var(--muted)' }}>Saat Dilimi:</td><td style={{ textAlign: 'right', fontWeight: 500, fontSize: 12 }}>{selectedTenant.timezone || 'Europe/Istanbul'}</td></tr>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '8px 0', color: 'var(--muted)' }}>Kayıt Tarihi:</td><td style={{ textAlign: 'right', fontWeight: 500 }}>{selectedTenant.created_at ? new Date(selectedTenant.created_at).toLocaleDateString('tr-TR') : '—'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Admin Notes Section */}
                    <div style={{ marginTop: 20, padding: 14, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Shield size={12} /> Sistem Admin Notları
                      </div>
                      <p style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap', color: (selectedTenant.settings as any)?.admin_notes ? 'var(--foreground)' : 'var(--muted)', fontStyle: (selectedTenant.settings as any)?.admin_notes ? 'normal' : 'italic' }}>
                        {(selectedTenant.settings as any)?.admin_notes || 'Henüz admin notu eklenmemiş.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab: Rooms */}
                {activeTab === 'rooms' && (
                  <div>
                    {detailRooms.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Bu işletmeye ait kayıtlı oda/birim bulunmuyor.</p>
                    ) : (
                      <table className="data-table" style={{ fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th>{selectedTenant && (selectedTenant.settings as any)?.business_type === 'entertainment' ? 'Kart / Bileklik Numarası' : 'Oda Numarası'}</th>
                            <th>{selectedTenant && (selectedTenant.settings as any)?.business_type === 'entertainment' ? 'Müşteri / Ziyaretçi' : 'Kart Sahibi / Misafir'}</th>
                            <th>Durum</th>
                            <th style={{ textAlign: 'right' }}>Bakiye</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailRooms.map(room => {
                            const roomGuest = detailGuests.find((g: any) => g.room_id === room.id);
                            return (
                              <tr key={room.id}>
                                <td style={{ fontWeight: 600 }}>
                                  {selectedTenant && (selectedTenant.settings as any)?.business_type === 'entertainment' ? `Kart ${room.room_number}` : `Oda ${room.room_number}`}
                                </td>
                                <td>
                                  {roomGuest ? (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontWeight: 500 }}>{roomGuest.guest_name}</span>
                                      <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>Card: {roomGuest.card_uid}</span>
                                    </div>
                                  ) : (
                                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                                      {selectedTenant && (selectedTenant.settings as any)?.business_type === 'entertainment' ? 'Aktif Değil (Ziyaretçi Yok)' : 'Boş (Misafir Yok)'}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {room.status === 'occupied' && <span className="badge badge-success">Dolu</span>}
                                  {room.status === 'active' && <span className="badge badge-primary">Boş</span>}
                                  {room.status === 'maintenance' && <span className="badge badge-danger">Bakımda</span>}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>₺{Number(room.wallet_balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab: Devices & Locations */}
                {activeTab === 'devices' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Locations */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>Hizmet Noktaları</div>
                      {detailLocations.length === 0 ? (
                        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Lokasyon tanımlanmamış.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {detailLocations.map(loc => (
                            <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8 }}>
                              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent-glow)', color: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                {loc.slug === 'reception' && '🏢'}
                                {loc.slug === 'restaurant' && '🍕'}
                                {loc.slug === 'bar' && '🍷'}
                                {loc.slug === 'spa' && '🧖'}
                                {loc.slug === 'vr-zone' && '🎮'}
                                {loc.slug === 'trampoline' && '🤸'}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{loc.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Devices */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>Aktif POS Terminalleri</div>
                      {detailDevices.length === 0 ? (
                        <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                          <Smartphone size={20} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                          Kayıtlı terminal yok
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {detailDevices.map(dev => (
                            <div key={dev.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Smartphone size={14} style={{ color: 'var(--muted)' }} />
                                <span style={{ fontSize: 13, fontWeight: 500 }}>{dev.device_name}</span>
                              </div>
                              <span className="badge badge-success" style={{ fontSize: 10 }}>Aktif</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Recent Transactions */}
                {activeTab === 'txns' && (
                  <div>
                    {detailTransactions.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Henüz işlem kaydı bulunmuyor.</p>
                    ) : (
                      <table className="data-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th>Tarih</th>
                            <th>Tür</th>
                            <th>Lokasyon</th>
                            <th style={{ textAlign: 'right' }}>Tutar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailTransactions.map(tx => (
                            <tr key={tx.id}>
                              <td>{new Date(tx.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                              <td>
                                {tx.type === 'charge' && <span style={{ color: 'var(--danger)' }}>Ödeme</span>}
                                {tx.type === 'topup' && <span style={{ color: 'var(--success)' }}>Yükleme</span>}
                                {tx.type === 'refund' && <span style={{ color: 'var(--warning)' }}>İade</span>}
                              </td>
                              <td style={{ color: 'var(--muted)' }}>{tx.location}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: tx.type === 'charge' ? 'var(--danger)' : 'var(--success)' }}>
                                {tx.type === 'charge' ? '-' : '+'}₺{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab: Subscription History */}
                {activeTab === 'history' && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16 }}>Abonelik ve Lisans Geçmişi</div>
                    {!(selectedTenant.settings as any)?.subscription_history || (selectedTenant.settings as any).subscription_history.length === 0 ? (
                      <div style={{ padding: 24, border: '1px dashed var(--border)', borderRadius: 8, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                        Henüz abonelik geçmişi kaydı bulunmuyor. İlk plan veya bitiş tarihi değişikliğinde kayıtlar burada listelenecektir.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 12, borderLeft: '2px solid var(--border)', marginLeft: 8 }}>
                        {(selectedTenant.settings as any).subscription_history.map((item: any, idx: number) => (
                          <div key={idx} style={{ position: 'relative' }}>
                            <div style={{
                              position: 'absolute', left: -17, top: 4, width: 8, height: 8, borderRadius: '50%',
                              backgroundColor: idx === 0 ? 'var(--primary)' : 'var(--muted)',
                              border: '2px solid var(--card-bg)'
                            }} />
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{item.action || 'Lisans Güncellemesi'}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                              Plan: <strong style={{ color: 'var(--foreground)' }}>{item.plan === 'premium' ? 'Premium Plan' : item.plan === 'basic' ? 'Standart Plan' : 'Lisans Yok (Kilitli)'}</strong> 
                              {item.expires_at && ` • Bitiş: ${new Date(item.expires_at).toLocaleDateString('tr-TR')}`}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                              {new Date(item.changed_at).toLocaleString('tr-TR')} • Yapan: {item.by}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Edit Form */}
                {activeTab === 'edit' && (
                  <div>
                    {formError && (
                      <div style={{ padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                        {formError}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="input-label">İşletme Adı</label>
                          <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} />
                        </div>
                        <div>
                          <label className="input-label">Durum</label>
                          <select className="input" value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                            <option value="active">Aktif</option>
                            <option value="inactive">Pasif</option>
                            <option value="suspended">Askıda</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="input-label">E-posta</label>
                          <input className="input" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                        </div>
                        <div>
                          <label className="input-label">Telefon</label>
                          <input className="input" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="input-label">Abonelik Planı</label>
                          <select className="input" value={formPlan} onChange={(e) => setFormPlan(e.target.value)}>
                            <option value="none">Lisans Yok (Kilitli)</option>
                            <option value="basic">Standart Plan</option>
                            <option value="premium">Premium Plan</option>
                          </select>
                        </div>
                        <div>
                          <label className="input-label">Lisans Bitiş Tarihi</label>
                          <input className="input" type="date" value={formExpiresAt} onChange={(e) => setFormExpiresAt(e.target.value)} />
                        </div>
                      </div>

                      <div style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="input-label">İşletme Türü</label>
                          <select className="input" value={formBusinessType} onChange={(e) => setFormBusinessType(e.target.value as 'hotel' | 'entertainment')}>
                            <option value="hotel">Konaklama / Otel</option>
                            <option value="entertainment">Eğlence Merkezi / Tesis</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)', paddingBottom: 10 }}>
                            * Tür değişimi mevcut konum/odaları silmez, ancak panel gösterimlerini günceller.
                          </span>
                        </div>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="input-label">🛡️ Admin Notları</label>
                        <textarea 
                          className="input" 
                          rows={3} 
                          value={formAdminNotes} 
                          onChange={(e) => setFormAdminNotes(e.target.value)} 
                          placeholder="Bu işletmeye dair özel notları ekleyin (Yalnızca superadmin ve platform sahipleri görebilir)..."
                          style={{ minHeight: 60, resize: 'vertical' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 12, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                        <button className="btn btn-ghost" onClick={() => setShowDetailsModal(false)} style={{ flex: 1 }}>İptal</button>
                        <button className="btn btn-primary" onClick={handleSaveEdit} disabled={formSaving} style={{ flex: 1 }}>
                          {formSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Ayarları Güncelle
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} style={{ color: 'var(--accent)' }} />
                Yeni İşletme Kaydı Oluştur
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="input-label">İşletme Adı</label>
                <input className="input" placeholder="Grand Antigravity Resort veya Funtasia Eğlence Merkezi" value={addName} onChange={(e) => setAddName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="input-label">E-posta</label>
                  <input className="input" type="email" placeholder="info@resort.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Telefon</label>
                  <input className="input" placeholder="+90 555 123 4567" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="input-label">Para Birimi</label>
                  <select className="input" value={addCurrency} onChange={(e) => setAddCurrency(e.target.value)}>
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Zaman Dilimi</label>
                  <select className="input" value={addTimezone} onChange={(e) => setAddTimezone(e.target.value)}>
                    <option value="Europe/Istanbul">Europe/Istanbul (GMT+3)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="input-label">Durum</label>
                  <select className="input" value={addStatus} onChange={(e) => setAddStatus(e.target.value as any)}>
                    <option value="inactive">Pasif / Aktivasyon Bekliyor</option>
                    <option value="active">Aktif</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Abonelik Planı</label>
                  <select className="input" value={addPlan} onChange={(e) => setAddPlan(e.target.value)}>
                    <option value="none">Lisans Yok (Kilitli)</option>
                    <option value="basic">Standart Plan</option>
                    <option value="premium">Premium Plan</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="input-label">Lisans Bitiş Tarihi</label>
                  <input className="input" type="date" value={addExpiresAt} onChange={(e) => setAddExpiresAt(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="input-label">İşletme Türü</label>
                  <select className="input" value={addBusinessType} onChange={(e) => setAddBusinessType(e.target.value as 'hotel' | 'entertainment')} style={{ width: '100%' }}>
                    <option value="hotel">Konaklama / Otel</option>
                    <option value="entertainment">Eğlence Merkezi / Tesis</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleCreateTenant} disabled={formSaving} style={{ flex: 1 }}>
                {formSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Kayıt Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
