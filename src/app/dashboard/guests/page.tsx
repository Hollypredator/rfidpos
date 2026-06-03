'use client';

import React, { useEffect, useState } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, Loader2, CreditCard, X, Save, DoorOpen,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { createClient } from '../../../utils/supabase';
import { Guest, Room } from '../../../types';

export default function GuestsPage() {
  const { tenant } = useAuth();
  const supabase = createClient();
  const [guests, setGuests] = useState<(Guest & { room?: Room })[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formCardUid, setFormCardUid] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formPinCode, setFormPinCode] = useState('1234');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);

    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('room_number');
    setRooms(roomsData || []);

    const roomIds = (roomsData || []).map((r: any) => r.id);
    if (roomIds.length > 0) {
      const { data: guestsData } = await supabase
        .from('guests')
        .select('*, room:rooms(room_number, wallet_balance, pin_code)')
        .in('room_id', roomIds)
        .order('guest_name');
      setGuests(guestsData || []);
    } else {
      setGuests([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener('rfid-db-updated', handleUpdate);
    return () => {
      window.removeEventListener('rfid-db-updated', handleUpdate);
    };
  }, [tenant?.id]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const scanUid = params.get('scanUid');
      if (scanUid && rooms.length > 0 && !isLoading) {
        setEditingGuest(null);
        setFormName('');
        setFormCardUid(scanUid);
        setFormRoomId(rooms[0]?.id || '');
        setFormStatus('active');
        setFormPinCode(rooms[0]?.pin_code || '1234');
        setFormError(null);
        setShowModal(true);

        const url = new URL(window.location.href);
        url.searchParams.delete('scanUid');
        window.history.replaceState({}, '', url.pathname);
      }
    }
  }, [rooms, isLoading]);

  const openAddModal = () => {
    setEditingGuest(null);
    setFormName('');
    setFormCardUid('');
    const defaultRoom = rooms[0];
    setFormRoomId(defaultRoom?.id || '');
    setFormStatus('active');
    setFormPinCode(defaultRoom?.pin_code || '1234');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (guest: Guest) => {
    setEditingGuest(guest);
    setFormName(guest.guest_name);
    setFormCardUid(guest.card_uid);
    setFormRoomId(guest.room_id);
    setFormStatus(guest.status);
    setFormPinCode((guest as any).room?.pin_code || '1234');
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formCardUid || !formRoomId) {
      setFormError('Tüm alanlar zorunludur.');
      return;
    }
    if (!/^[0-9]{4}$/.test(formPinCode)) {
      setFormError('PIN kodu 4 haneli rakam olmalıdır.');
      return;
    }
    setFormSaving(true);
    setFormError(null);

    try {
      // 1. Karta atanan odanın şifresini ve durumunu güncelle
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ pin_code: formPinCode, status: 'occupied' })
        .eq('id', formRoomId);
      if (roomError) throw roomError;

      // 2. Misafir kaydını yap
      if (editingGuest) {
        const { error } = await supabase
          .from('guests')
          .update({ guest_name: formName, card_uid: formCardUid, room_id: formRoomId, status: formStatus })
          .eq('id', editingGuest.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('guests')
          .insert({ guest_name: formName, card_uid: formCardUid, room_id: formRoomId, status: formStatus });
        if (error) throw error;
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Kayıt hatası');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (guestId: string) => {
    if (!confirm('Bu misafiri silmek istediğinize emin misiniz?')) return;
    await supabase.from('guests').delete().eq('id', guestId);
    fetchData();
  };

  const filtered = guests.filter(g =>
    g.guest_name.toLowerCase().includes(search.toLowerCase()) ||
    g.card_uid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Misafirler</h1>
          <p className="page-subtitle">{guests.length} misafir kayıtlı</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} disabled={rooms.length === 0}>
          <Plus size={16} /> Yeni Misafir
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input className="input" placeholder="İsim veya kart UID ara..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>{search ? 'Sonuç bulunamadı' : 'Henüz misafir eklenmemiş'}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Misafir</th>
                <th>Kart UID</th>
                <th>Oda</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((guest) => (
                <tr key={guest.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 600, color: 'white', flexShrink: 0,
                      }}>
                        {guest.guest_name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{guest.guest_name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent-light)', background: 'var(--accent-glow)', padding: '2px 8px', borderRadius: 6 }}>
                      {guest.card_uid}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <DoorOpen size={14} style={{ color: 'var(--muted)' }} />
                      <span>{(guest as any).room?.room_number || '—'}</span>
                    </div>
                  </td>
                  <td>
                    {guest.status === 'active'
                      ? <span className="badge badge-success">Aktif</span>
                      : <span className="badge badge-muted">Pasif</span>
                    }
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(guest)}><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(guest.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>{editingGuest ? 'Misafir Düzenle' : 'Yeni Misafir'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label">Misafir Adı</label>
                <input className="input" placeholder="Ahmet Yılmaz" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div>
                <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>RFID Kart UID</span>
                  <span style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CreditCard size={12} className="animate-pulse" />
                    Okuyucu Hazır
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    className="input" 
                    placeholder="A1B2C3D4" 
                    value={formCardUid} 
                    onChange={(e) => setFormCardUid(e.target.value.toUpperCase())} 
                    style={{ paddingRight: 80 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const randomHex = Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase();
                      setFormCardUid(randomHex);
                    }}
                    style={{
                      position: 'absolute',
                      right: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 10,
                      padding: '4px 8px',
                      height: 'auto',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                    title="Rastgele test kartı simüle et"
                  >
                    Simüle Et
                  </button>
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                  Resepsiyon USB RFID Okuyucunuz bağlıysa bu kutuya odaklanıp kartı okutmanız yeterlidir.
                </span>
              </div>
              <div>
                <label className="input-label">Oda</label>
                <select 
                  className="input" 
                  value={formRoomId} 
                  onChange={(e) => {
                    const rId = e.target.value;
                    setFormRoomId(rId);
                    const selectedRoom = rooms.find(r => r.id === rId);
                    if (selectedRoom) {
                      setFormPinCode(selectedRoom.pin_code || '1234');
                    }
                  }}
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>Oda {r.room_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Kart PIN Kodu (4 Hane)</label>
                <input 
                  className="input" 
                  maxLength={4}
                  placeholder="1234" 
                  value={formPinCode} 
                  onChange={(e) => setFormPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                />
                <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                  Kayıtlı kartın POS cihazlarında harcama yaparken kullanacağı 4 haneli güvenlik şifresidir.
                </span>
              </div>
              <div>
                <label className="input-label">Durum</label>
                <select className="input" value={formStatus} onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={formSaving} style={{ flex: 1 }}>
                {formSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingGuest ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
