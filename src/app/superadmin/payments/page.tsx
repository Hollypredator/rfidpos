'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard, Search, Loader2, Check, X, RefreshCw, AlertCircle,
  Plus, Banknote, Calendar, CheckCircle, Ban, CalendarDays, Coins
} from 'lucide-react';
import { createClient } from '../../../utils/supabase';
import { MockPayment } from '../../../utils/mockDb';

export default function PaymentsLedgerPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<MockPayment[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // New Payment Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form States
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('Akbank');
  const [senderName, setSenderName] = useState('');
  const [refCode, setRefCode] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: paymentsData } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      const { data: tenantsData } = await supabase.from('tenants').select('id, name');
      
      setPayments(paymentsData || []);
      setTenants(tenantsData || []);

      if (tenantsData && tenantsData.length > 0 && !selectedTenantId) {
        setSelectedTenantId(tenantsData[0].id);
      }
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (payment: MockPayment) => {
    if (!confirm(`${payment.tenant_name} ödemesini onaylamak istiyor musunuz? Bu işlem otelin lisansını otomatik olarak 1 yıl (365 gün) uzatacaktır.`)) return;
    
    try {
      // 1. Update Payment Status to approved
      await supabase.from('payments').update({ status: 'approved' }).eq('id', payment.id);

      // 2. Set Expiration Date to 1 Year from now
      const oneYearLater = new Date();
      oneYearLater.setDate(oneYearLater.getDate() + 365);

      // 3. Update Tenant state in database
      const { error: tenantErr } = await supabase
        .from('tenants')
        .update({
          status: 'active',
          subscription_plan: 'basic', // standard basic plan on approval
          subscription_expires_at: oneYearLater.toISOString()
        })
        .eq('id', payment.tenant_id);

      if (tenantErr) throw tenantErr;

      // 4. Create Audit Log
      await supabase.from('audit_logs').insert({
        tenant_id: payment.tenant_id,
        action: 'manual_payment_approved',
        entity_type: 'payment',
        entity_id: payment.id,
        metadata: {
          approved_amount: payment.amount,
          subscription_expires_at: oneYearLater.toISOString()
        }
      });

      alert(`${payment.tenant_name} lisansı 1 yıl uzatıldı ve aktifleştirildi.`);
      loadData();
    } catch (err: any) {
      alert('Onaylama işlemi başarısız: ' + err.message);
    }
  };

  const handleReject = async (payment: MockPayment) => {
    if (!confirm(`${payment.tenant_name} havale bildirimini reddetmek istediğinize emin misiniz?`)) return;
    try {
      await supabase.from('payments').update({ status: 'rejected' }).eq('id', payment.id);
      loadData();
    } catch (err: any) {
      alert('İşlem başarısız: ' + err.message);
    }
  };

  const handleCreatePayment = async () => {
    if (!amount || Number(amount) <= 0) {
      setFormError('Lütfen geçerli bir tutar giriniz.');
      return;
    }
    setFormSaving(true);
    setFormError(null);

    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant) return;

    try {
      const newPayment = {
        id: `pay-${Math.random().toString(36).substr(2, 9)}`,
        tenant_id: selectedTenantId,
        tenant_name: tenant.name,
        amount: Number(amount),
        bank_name: bankName,
        sender_name: senderName || tenant.name,
        reference_code: refCode || selectedTenantId,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      await supabase.from('payments').insert(newPayment);

      // Reset
      setAmount('');
      setSenderName('');
      setRefCode('');
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Ödeme kaydı oluşturulamadı.');
    } finally {
      setFormSaving(false);
    }
  };

  const filtered = payments.filter(p =>
    p.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
    p.sender_name.toLowerCase().includes(search.toLowerCase()) ||
    p.reference_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Manuel Ödemeler & Havale Defteri</h1>
          <p className="page-subtitle">Banka havalesi ile yapılan donanım ve lisans ödemelerini doğrulayıp onaylayın.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(null); setShowAddModal(true); }}>
          <Plus size={16} /> Ödeme Kaydı Gir
        </button>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ position: 'relative', maxWidth: 320, width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input className="input" placeholder="Otel, gönderen veya referans ara..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Yenile
        </button>
      </div>

      {/* Payments Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <CreditCard size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>Eşleşen ödeme kaydı bulunamadı</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Otel</th>
                <th>Gönderen & Banka</th>
                <th>Tutar</th>
                <th>Referans ID (Otel ID)</th>
                <th>Tarih</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="table-row-hover">
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.tenant_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>ID: {p.tenant_id}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.sender_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.bank_name}</div>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                    ₺{Number(p.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <code style={{ fontSize: 11, color: 'var(--accent-light)' }}>{p.reference_code}</code>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {new Date(p.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    {p.status === 'pending' && <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} /> Beklemede</span>}
                    {p.status === 'approved' && <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} /> Onaylandı</span>}
                    {p.status === 'rejected' && <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ban size={10} /> Reddedildi</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {p.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-success btn-sm" 
                          onClick={() => handleApprove(p)} 
                          style={{ padding: '4px 10px', height: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                          title="Ödemeyi Onayla ve Lisansı Etkinleştir"
                        >
                          <Check size={14} /> Onayla (+365 Gün)
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => handleReject(p)}
                          style={{ padding: '4px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                          title="Ödeme Bildirimini Reddet"
                        >
                          <X size={14} /> Reddet
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Tamamlandı</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Banknote size={18} style={{ color: 'var(--success)' }} />
                Manuel Ödeme / Havale Girişi
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
                <label className="input-label">Ödeme Yapan Otel</label>
                <select className="input" value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="input-label">Havale Tutarı (₺)</label>
                  <input className="input" type="number" placeholder="15000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div>
                  <label className="input-label">Alıcı Banka</label>
                  <select className="input" value={bankName} onChange={(e) => setBankName(e.target.value)}>
                    <option value="Akbank">Akbank</option>
                    <option value="Garanti BBVA">Garanti BBVA</option>
                    <option value="Yapı Kredi">Yapı Kredi</option>
                    <option value="QNB Finansbank">QNB Finansbank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Gönderen Ünvanı / Adı</label>
                <input className="input" placeholder="Grand Antigravity Turizm A.Ş." value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              </div>

              <div>
                <label className="input-label">Havale Açıklaması / Referans Kodu (Varsayılan Otel ID'si)</label>
                <input className="input" placeholder={selectedTenantId} value={refCode} onChange={(e) => setRefCode(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleCreatePayment} disabled={formSaving} style={{ flex: 1 }}>
                {formSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Ödeme Bildirimi Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
