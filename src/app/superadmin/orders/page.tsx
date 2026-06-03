'use client';

import React, { useEffect, useState } from 'react';
import {
  Package, Search, Loader2, Edit2, Truck, RefreshCw,
  Plus, Check, X, Tag, Calendar, Smartphone, Info
} from 'lucide-react';
import { createClient } from '../../../utils/supabase';
import { MockOrder } from '../../../utils/mockDb';

export default function HardwareOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null);

  // Form States - Add
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  
  // Form States - Edit/Update Shipping
  const [editStatus, setEditStatus] = useState<'preparing' | 'shipped' | 'delivered'>('preparing');
  const [editCarrier, setEditCarrier] = useState('');
  const [editTrackingNumber, setEditTrackingNumber] = useState('');

  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: ordersData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      const { data: tenantsData } = await supabase.from('tenants').select('id, name');

      setOrders(ordersData || []);
      setTenants(tenantsData || []);

      if (tenantsData && tenantsData.length > 0 && !selectedTenantId) {
        setSelectedTenantId(tenantsData[0].id);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (order: MockOrder) => {
    setSelectedOrder(order);
    setEditStatus(order.shipping_status);
    setEditCarrier(order.carrier || '');
    setEditTrackingNumber(order.tracking_number || '');
    setFormError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;
    setFormSaving(true);
    setFormError(null);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          shipping_status: editStatus,
          carrier: editCarrier || null,
          tracking_number: editTrackingNumber || null
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Log shipping update to audit logs
      await supabase.from('audit_logs').insert({
        tenant_id: selectedOrder.tenant_id,
        action: 'hardware_order_shipping_updated',
        entity_type: 'order',
        entity_id: selectedOrder.id,
        metadata: {
          shipping_status: editStatus,
          carrier: editCarrier,
          tracking_number: editTrackingNumber
        }
      });

      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Sipariş güncellenemedi.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderDetails) {
      setFormError('Lütfen sipariş içeriğini belirtiniz.');
      return;
    }
    setFormSaving(true);
    setFormError(null);

    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant) return;

    try {
      const newOrder = {
        id: `order-${Math.random().toString(36).substr(2, 9)}`,
        tenant_id: selectedTenantId,
        tenant_name: tenant.name,
        details: orderDetails,
        shipping_status: 'preparing',
        created_at: new Date().toISOString()
      };

      await supabase.from('orders').insert(newOrder);

      // Reset
      setOrderDetails('');
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Sipariş kaydı oluşturulamadı.');
    } finally {
      setFormSaving(false);
    }
  };

  const filtered = orders.filter(o =>
    o.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
    o.details.toLowerCase().includes(search.toLowerCase()) ||
    (o.tracking_number || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Donanım & Terminal Sevk Takibi</h1>
          <p className="page-subtitle">Sipariş edilen RFID okuyucuları, Android POS el terminallerini ve kartları sevk edin.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(null); setShowAddModal(true); }}>
          <Plus size={16} /> Sipariş Girişi Yap
        </button>
      </div>

      {/* Search and filters */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ position: 'relative', maxWidth: 320, width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input className="input" placeholder="Otel adı veya kargo takip no ara..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Yenile
        </button>
      </div>

      {/* Orders Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>Sevk kaydı bulunamadı</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Otel</th>
                <th>Sipariş Detayı</th>
                <th>Sipariş Tarihi</th>
                <th>Kargo Durumu</th>
                <th>Takip Bilgileri</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="table-row-hover">
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.tenant_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>ID: {o.tenant_id}</div>
                  </td>
                  <td style={{ fontSize: 13, maxWidth: 300 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Smartphone size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                      <span>{o.details}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {new Date(o.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td>
                    {o.shipping_status === 'preparing' && <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Tag size={10} /> Hazırlanıyor</span>}
                    {o.shipping_status === 'shipped' && <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Truck size={10} /> Kargolandı</span>}
                    {o.shipping_status === 'delivered' && <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={10} /> Teslim Edildi</span>}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {o.carrier && o.tracking_number ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>{o.carrier}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>No: {o.tracking_number}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Kargo Bilgisi Yok</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => handleOpenEdit(o)}
                      style={{ color: 'var(--accent-light)' }}
                    >
                      <Edit2 size={14} /> Durum Güncelle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={18} style={{ color: 'var(--accent)' }} />
                Yeni Donanım / Terminal Sipariş Girişi
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label">Otel Seçin</label>
                <select className="input" value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Sipariş İçeriği (Donanım ve Ekipman Detayları)</label>
                <textarea 
                  className="input" 
                  rows={4}
                  placeholder="Örnek: 3x Android POS El Terminali, 1x USB RFID Kart Okuyucu, 250x RFID Kart" 
                  value={orderDetails} 
                  onChange={(e) => setOrderDetails(e.target.value)}
                  required
                  style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleCreateOrder} disabled={formSaving} style={{ flex: 1 }}>
                <Check size={16} /> Siparişi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shipping Modal */}
      {showEditModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={18} style={{ color: 'var(--accent)' }} />
                Sevkiyat Durumunu Güncelle
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong>Otel:</strong> {selectedOrder.tenant_name} <br/>
                <strong>İçerik:</strong> {selectedOrder.details}
              </div>

              <div>
                <label className="input-label">Sevkiyat Durumu</label>
                <select className="input" value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)}>
                  <option value="preparing">Hazırlanıyor / Paketlemede</option>
                  <option value="shipped">Kargolandı / Yolda</option>
                  <option value="delivered">Teslim Edildi / İşlem Tamamlandı</option>
                </select>
              </div>

              {editStatus !== 'preparing' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="animate-fade-in">
                  <div>
                    <label className="input-label">Kargo Firması</label>
                    <input className="input" placeholder="Yurtiçi Kargo" value={editCarrier} onChange={(e) => setEditCarrier(e.target.value)} />
                  </div>
                  <div>
                    <label className="input-label">Kargo Takip No</label>
                    <input className="input" placeholder="YK1234567890" value={editTrackingNumber} onChange={(e) => setEditTrackingNumber(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowEditModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={formSaving} style={{ flex: 1 }}>
                <Check size={16} /> Güncellemeleri Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
