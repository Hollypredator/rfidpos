'use client';

import React, { useEffect, useState } from 'react';
import {
  MessageSquare, Search, Loader2, Check, X, RefreshCw,
  Plus, MessageCircle, AlertTriangle, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { createClient } from '../../../utils/supabase';
import { MockSupportTicket } from '../../../utils/mockDb';

export default function SupportTicketsPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<MockSupportTicket[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MockSupportTicket | null>(null);

  // Form States - Add
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Form States - Reply/Resolve
  const [replyMessage, setReplyMessage] = useState('');
  const [resolveStatus, setResolveStatus] = useState<'pending' | 'resolved'>('resolved');

  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Conversation history states
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: ticketsData } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
      const { data: tenantsData } = await supabase.from('tenants').select('id, name');

      setTickets(ticketsData || []);
      setTenants(tenantsData || []);

      if (tenantsData && tenantsData.length > 0 && !selectedTenantId) {
        setSelectedTenantId(tenantsData[0].id);
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenReply = async (ticket: MockSupportTicket) => {
    setSelectedTicket(ticket);
    setResolveStatus(ticket.status === 'pending' ? 'resolved' : ticket.status);
    setReplyMessage('');
    setFormError(null);
    setShowReplyModal(true);

    setLoadingHistory(true);
    try {
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', ticket.id)
        .in('action', ['support_ticket_replied', 'support_ticket_user_replied']);
      
      const sorted = (logsData || []).sort((a: any, b: any) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
      setTicketHistory(sorted);
    } catch (err) {
      console.error('Error fetching conversation history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveReply = async () => {
    if (!selectedTicket) return;
    setFormSaving(true);
    setFormError(null);

    try {
      // 1. Update ticket status in database
      const { error } = await supabase
        .from('tickets')
        .update({
          status: resolveStatus
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      // 2. Log reply to audit logs
      await supabase.from('audit_logs').insert({
        tenant_id: selectedTicket.tenant_id,
        action: 'support_ticket_replied',
        entity_type: 'ticket',
        entity_id: selectedTicket.id,
        metadata: {
          reply_message: replyMessage,
          status: resolveStatus
        }
      });

      setShowReplyModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Yanıt kaydedilemedi.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!ticketSubject || !ticketMessage) {
      setFormError('Konu ve mesaj alanları zorunludur.');
      return;
    }
    setFormSaving(true);
    setFormError(null);

    const tenant = tenants.find(t => t.id === selectedTenantId);
    if (!tenant) return;

    try {
      const newTicket = {
        id: `ticket-${Math.random().toString(36).substr(2, 9)}`,
        tenant_id: selectedTenantId,
        tenant_name: tenant.name,
        subject: ticketSubject,
        message: ticketMessage,
        priority: ticketPriority,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      await supabase.from('tickets').insert(newTicket);

      // Reset
      setTicketSubject('');
      setTicketMessage('');
      setTicketPriority('medium');
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Destek kaydı oluşturulamadı.');
    } finally {
      setFormSaving(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'high': return <span className="badge badge-danger" style={{ fontSize: 11 }}>Yüksek</span>;
      case 'medium': return <span className="badge badge-warning" style={{ fontSize: 11 }}>Orta</span>;
      default: return <span className="badge badge-muted" style={{ fontSize: 11 }}>Düşük</span>;
    }
  };

  const filtered = tickets.filter(t =>
    t.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Destek & Aktivasyon Talepleri</h1>
          <p className="page-subtitle">Otellerden gelen lisans aktivasyon isteklerini ve destek mesajlarını yanıtlayın.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(null); setShowAddModal(true); }}>
          <Plus size={16} /> Talep Girişi Yap
        </button>
      </div>

      {/* Search and filter */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ position: 'relative', maxWidth: 320, width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input className="input" placeholder="Otel adı, konu veya mesaj ara..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Yenile
        </button>
      </div>

      {/* Tickets Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p>Destek talebi bulunamadı</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Otel</th>
                <th>Konu</th>
                <th>Öncelik</th>
                <th>Tarih</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="table-row-hover">
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.tenant_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>ID: {t.tenant_id}</div>
                  </td>
                  <td style={{ maxWidth: 320 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.subject}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {t.message}
                    </div>
                  </td>
                  <td>{getPriorityBadge(t.priority)}</td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {new Date(t.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    {t.status === 'pending' ? (
                      <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ShieldAlert size={10} /> Beklemede</span>
                    ) : (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={10} /> Çözüldü</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => handleOpenReply(t)}
                      style={{ color: 'var(--accent-light)' }}
                    >
                      <MessageCircle size={14} /> Yanıtla / Çöz
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Ticket Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} style={{ color: 'var(--accent)' }} />
                Yeni Destek Kaydı Oluştur
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                <div>
                  <label className="input-label">Talebi Açan Otel</label>
                  <select className="input" value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Öncelik Seviyesi</label>
                  <select className="input" value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value as any)}>
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Talep Konusu</label>
                <input className="input" placeholder="Aktivasyon Sorunu, Donanım Bozuk vb." value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} required />
              </div>

              <div>
                <label className="input-label">Destek Mesajı Detayları</label>
                <textarea 
                  className="input" 
                  rows={4}
                  placeholder="Detaylı destek açıklamasını buraya yazınız..." 
                  value={ticketMessage} 
                  onChange={(e) => setTicketMessage(e.target.value)}
                  required
                  style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleCreateTicket} disabled={formSaving} style={{ flex: 1 }}>
                <Check size={16} /> Talebi Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={18} style={{ color: 'var(--accent)' }} />
                Destek Talebini Yanıtla & Çözümle
              </h3>
              <button onClick={() => setShowReplyModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Chat Thread History */}
              <div style={{
                maxHeight: '220px',
                overflowY: 'auto',
                fontSize: '12px',
                color: 'var(--foreground)',
                background: 'rgba(0,0,0,0.15)',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', fontWeight: 600 }}>
                  Konu: {selectedTicket.subject}
                </div>

                {/* Initial Hotel Message */}
                <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                  <div style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    padding: '8px 12px',
                    borderRadius: '12px 12px 12px 2px',
                    color: 'var(--foreground)'
                  }}>
                    {selectedTicket.message}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--muted)', marginTop: 4 }}>
                    Otel Yöneticisi • {new Date(selectedTicket.created_at).toLocaleString('tr-TR')}
                  </div>
                </div>

                {/* Reply Logs */}
                {loadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--muted)' }}>
                    <Loader2 size={16} className="animate-spin" style={{ display: 'inline-block', marginRight: 6 }} />
                    Sohbet geçmişi yükleniyor...
                  </div>
                ) : (
                  ticketHistory.map((reply) => {
                    const isUser = reply.action === 'support_ticket_user_replied';
                    return (
                      <div key={reply.id} style={{ alignSelf: isUser ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                        <div style={{
                          background: isUser ? 'var(--card)' : 'linear-gradient(135deg, var(--accent), #4f46e5)',
                          border: isUser ? '1px solid var(--border)' : 'none',
                          color: isUser ? 'var(--foreground)' : 'white',
                          padding: '8px 12px',
                          borderRadius: isUser ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                          boxShadow: isUser ? 'none' : '0 2px 6px rgba(79, 70, 229, 0.15)'
                        }}>
                          {reply.metadata?.reply_message || 'Yanıt içeriği boş.'}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--muted)', marginTop: 4, textAlign: isUser ? 'left' : 'right' }}>
                          {isUser ? 'Otel Yöneticisi' : 'Siz (Destek Ekibi)'} • {new Date(reply.created_at).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div>
                <label className="input-label">İçsel İşlem Durumu</label>
                <select className="input" value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value as any)}>
                  <option value="resolved">Çözüldü / Kapatıldı</option>
                  <option value="pending">İnceleme Aşamasında / Beklemede</option>
                </select>
              </div>

              <div>
                <label className="input-label">Cevap Mesajı (Otel Yöneticisine Gidecek Yanıt Notu)</label>
                <textarea 
                  className="input" 
                  rows={4}
                  placeholder="Yanıt notunuzu buraya yazın. (Örn: Havale ödemeniz onaylanmış, donanım sevk işleminiz başlatılmıştır. Lisansınız aktif edilmiştir.)" 
                  value={replyMessage} 
                  onChange={(e) => setReplyMessage(e.target.value)}
                  style={{ resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setShowReplyModal(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn btn-primary" onClick={handleSaveReply} disabled={formSaving} style={{ flex: 1 }}>
                <Check size={16} /> Talebi Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
