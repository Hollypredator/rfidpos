'use client';

import React, { useEffect, useState } from 'react';
import {
  DoorOpen, Plus, Search, Edit2, Trash2, Loader2, CheckCircle, XCircle,
  Wallet, X, Save,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { createClient } from '../../../utils/supabase';
import { Room, RoomStatus } from '../../../types';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../contexts/ToastContext';

export default function RoomsPage() {
  const { tenant } = useAuth();
  const supabase = createClient();
  const t = useTerminology();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Form state
  const [formNumber, setFormNumber] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formStatus, setFormStatus] = useState<RoomStatus>('active');
  const [formBalance, setFormBalance] = useState('0');
  const [formDailyLimit, setFormDailyLimit] = useState('0');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRooms = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('room_number');
    if (!error) setRooms(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRooms();

    const handleUpdate = () => {
      fetchRooms();
    };
    window.addEventListener('rfid-db-updated', handleUpdate);
    return () => {
      window.removeEventListener('rfid-db-updated', handleUpdate);
    };
  }, [tenant?.id]);

  const openAddModal = () => {
    setEditingRoom(null);
    setFormNumber('');
    setFormPin('');
    setFormStatus('active');
    setFormBalance('0');
    setFormDailyLimit('0');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setFormNumber(room.room_number);
    setFormPin(room.pin_code);
    setFormStatus(room.status);
    setFormBalance(String(room.wallet_balance));
    setFormDailyLimit(String(room.daily_limit || 0));
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!tenant?.id) return;
    if (!/^[0-9]{4}$/.test(formPin)) {
      setFormError('PIN kodu 4 haneli rakam olmalıdır.');
      return;
    }
    setFormSaving(true);
    setFormError(null);

    try {
      if (editingRoom) {
        const { error } = await supabase
          .from('rooms')
          .update({
            room_number: formNumber,
            pin_code: formPin,
            status: formStatus,
            wallet_balance: Number(formBalance),
            daily_limit: Number(formDailyLimit),
          })
          .eq('id', editingRoom.id);
        if (error) throw error;
        toast({ message: `${t.roomLabel} başarıyla güncellendi!`, type: 'success' });
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert({
            tenant_id: tenant.id,
            room_number: formNumber,
            pin_code: formPin,
            status: formStatus,
            wallet_balance: Number(formBalance),
            daily_limit: Number(formDailyLimit),
          });
        if (error) throw error;
        toast({ message: `${t.roomLabel} başarıyla eklendi!`, type: 'success' });
      }
      setShowModal(false);
      fetchRooms();
      window.dispatchEvent(new CustomEvent('rfid-db-updated'));
    } catch (err: any) {
      setFormError(err.message || 'Kayıt hatası');
      toast({ message: `Hata: ${err.message || 'Kayıt işlemi başarısız!'}`, type: 'error' });
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm(`Bu ${t.roomLabel.toLowerCase()} kaydını silmek istediğinize emin misiniz?`)) return;
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) throw error;
      toast({ message: `${t.roomLabel} başarıyla silindi.`, type: 'warning' });
      fetchRooms();
      window.dispatchEvent(new CustomEvent('rfid-db-updated'));
    } catch (err: any) {
      toast({ message: `Hata: ${err.message}`, type: 'error' });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="badge badge-success">Aktif</span>;
      case 'occupied': return <span className="badge badge-accent">{t.roomLabel === 'Oda' ? 'Dolu' : 'Aktif/Kullanımda'}</span>;
      case 'maintenance': return <span className="badge badge-warning">Bakım</span>;
      case 'checked_out': return <span className="badge badge-muted">Çıkış</span>;
      default: return <span className="badge badge-muted">{status}</span>;
    }
  };

  const filtered = rooms.filter(r =>
    r.room_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">{t.roomsLabel}</h1>
          <p className="page-subtitle">{rooms.length} {t.roomLabel.toLowerCase()} kayıtlı</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> {t.newRoomLabel}
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            className="input"
            placeholder={t.roomDescLabel}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
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
            <DoorOpen size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>{search ? 'Sonuç bulunamadı' : `Henüz ${t.roomLabel.toLowerCase()} eklenmemiş`}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.roomNoLabel}</th>
                  <th>Bakiye</th>
                  <th>PIN</th>
                  <th>Durum</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <DoorOpen size={16} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 600 }}>{room.room_number}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: Number(room.wallet_balance) > 0 ? 'var(--success)' : 'var(--muted)' }}>
                        ₺{Number(room.wallet_balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>••••</td>
                    <td>{statusBadge(room.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(room)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(room.id)} style={{ color: 'var(--danger)' }}>
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                {editingRoom ? t.editRoomLabel : t.newRoomLabel}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label">{t.roomNoLabel}</label>
                <input className="input" placeholder="101" value={formNumber} onChange={(e) => setFormNumber(e.target.value)} />
              </div>
              <div>
                <label className="input-label">{t.pinLabel} (4 hane)</label>
                <input className="input" placeholder="1234" maxLength={4} value={formPin} onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              </div>
              <div>
                <label className="input-label">Bakiye (₺)</label>
                <input className="input" type="number" step="0.01" value={formBalance} onChange={(e) => setFormBalance(e.target.value)} />
              </div>
              <div>
                <label className="input-label">{t.dailyLimitLabel} (₺)</label>
                <input className="input" type="number" min="0" step="any" placeholder="0" value={formDailyLimit} onChange={(e) => setFormDailyLimit(e.target.value)} />
                <small style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4, display: 'block' }}>0 = tesis varsayılan limiti geçerlidir.</small>
              </div>
              <div>
                <label className="input-label">Durum</label>
                <select className="input" value={formStatus} onChange={(e) => setFormStatus(e.target.value as RoomStatus)}>
                  <option value="active">Aktif</option>
                  <option value="occupied">{t.roomLabel === 'Oda' ? 'Dolu' : 'Aktif/Kullanımda'}</option>
                  <option value="maintenance">Bakım</option>
                  <option value="checked_out">Çıkış Yapıldı</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={formSaving} style={{ flex: 1 }}>
                {formSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingRoom ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
