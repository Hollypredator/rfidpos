'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageCircle, X, Send, ChevronLeft, AlertCircle,
  Clock, CheckCircle, MessageSquare, Loader2, ArrowRight
} from 'lucide-react';
import { createClient } from '../utils/supabase';
import { MockSupportTicket } from '../utils/mockDb';
import { AuditLog } from '../types';

interface SupportChatbotProps {
  tenantId: string;
  tenantName: string;
  userRole: string;
}

export default function SupportChatbot({ tenantId, tenantName, userRole }: SupportChatbotProps) {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState<MockSupportTicket[]>([]);
  const [replies, setReplies] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Navigation
  // 'list' = showing past tickets
  // 'new' = creating a new ticket
  // 'detail' = viewing thread of a specific ticket
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedTicket, setSelectedTicket] = useState<MockSupportTicket | null>(null);

  // Form states
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reply states
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);

  // Fetch tickets and replies
  const fetchData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Fetch tickets
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Fetch replies (audit logs representing replies from both admin and user)
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('action', ['support_ticket_replied', 'support_ticket_user_replied']);

      setTickets(ticketsData || []);
      setReplies(logsData || []);
    } catch (err) {
      console.error('Destek verileri yüklenirken hata oluştu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenantId]);

  const handleOpenDetail = (ticket: MockSupportTicket) => {
    setSelectedTicket(ticket);
    setView('detail');
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setFormError('Lütfen tüm alanları doldurun.');
      return;
    }

    setFormSaving(true);
    setFormError(null);

    try {
      const newTicket = {
        id: `ticket-${Math.random().toString(36).substr(2, 9)}`,
        tenant_id: tenantId,
        tenant_name: tenantName,
        subject: subject,
        message: message,
        priority: priority,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('tickets').insert(newTicket);
      if (error) throw error;

      // Log insertion to audit logs
      await supabase.from('audit_logs').insert({
        tenant_id: tenantId,
        action: 'support_ticket_created',
        entity_type: 'ticket',
        entity_id: newTicket.id,
        metadata: {
          subject: subject,
          priority: priority
        }
      });

      // Clear form
      setSubject('');
      setMessage('');
      setPriority('medium');

      // Refresh and redirect
      await fetchData();
      setView('list');
    } catch (err: any) {
      setFormError(err.message || 'Destek talebi gönderilemedi.');
    } finally {
      setFormSaving(false);
    }
  };

  // Filter replies for selected ticket
  const getSelectedTicketReplies = () => {
    if (!selectedTicket) return [];
    return replies
      .filter(r => r.entity_id === selectedTicket.id)
      .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setReplySaving(true);
    try {
      const newReplyLog = {
        tenant_id: tenantId,
        user_id: null,
        action: 'support_ticket_user_replied',
        entity_type: 'ticket',
        entity_id: selectedTicket.id,
        metadata: {
          reply_message: replyText.trim(),
          status: 'pending'
        }
      };

      await supabase.from('audit_logs').insert(newReplyLog);

      // Update ticket status to pending in database
      await supabase
        .from('tickets')
        .update({ status: 'pending' })
        .eq('id', selectedTicket.id);

      setReplyText('');

      const updatedTicket = { ...selectedTicket, status: 'pending' as const };
      setSelectedTicket(updatedTicket);

      await fetchData();
    } catch (err) {
      console.error('Cevap gönderilirken hata oluştu:', err);
    } finally {
      setReplySaving(false);
    }
  };

  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  // Only show for manager & hotel_admin roles
  if (!['hotel_admin', 'manager'].includes(userRole)) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '85px',
          right: '20px',
          width: '54px',
          height: '54px',
          borderRadius: '27px',
          background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(79, 70, 229, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transform: isOpen ? 'rotate(90deg) scale(0.95)' : 'rotate(0) scale(1)'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.transform = 'scale(1) translateY(0)';
        }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        
        {/* Unresolved count badge */}
        {!isOpen && pendingCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: 'var(--danger)',
            color: 'white',
            borderRadius: '10px',
            minWidth: '20px',
            height: '20px',
            padding: '0 6px',
            fontSize: '11px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--card)'
          }}>
            {pendingCount}
          </span>
        )}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '150px',
          right: '20px',
          width: '370px',
          height: '520px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.16)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, var(--accent-glow), rgba(79, 70, 229, 0.02))',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MessageSquare size={18} color="white" />
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Operasyon ve Destek</h4>
                <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Destek ekibiyle anlık iletişim paneli</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* VIEW: TICKETS LIST */}
            {view === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Taleplerim</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setView('new')}
                      style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}
                    >
                      Yeni Talep Aç
                    </button>
                  </div>

                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                      <Loader2 size={24} className="animate-spin" style={{ marginBottom: 8, color: 'var(--accent)' }} />
                      <span style={{ fontSize: '13px' }}>Yükleniyor...</span>
                    </div>
                  ) : tickets.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, background: 'rgba(255,255,255,0.01)' }}>
                      <MessageCircle size={32} style={{ color: 'var(--muted)', opacity: 0.3, marginBottom: 8 }} />
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', margin: '0 0 4px' }}>Destek talebi bulunmuyor</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', margin: 0 }}>Cihaz kurulumu, ödeme onayları veya teknik sorularınız için yukarıdan talep oluşturabilirsiniz.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {tickets.map(t => (
                        <div
                          key={t.id}
                          onClick={() => handleOpenDetail(t)}
                          style={{
                            padding: '12px',
                            background: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-light)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                              {t.subject}
                            </span>
                            <span className={`badge ${t.status === 'pending' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                              {t.status === 'pending' ? 'Beklemede' : 'Çözüldü'}
                            </span>
                          </div>
                          
                          <p style={{
                            fontSize: '11px',
                            color: 'var(--muted)',
                            margin: '0 0 8px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {t.message}
                          </p>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--muted)' }}>
                            <span>Öncelik: <strong style={{ color: t.priority === 'high' ? 'var(--danger)' : t.priority === 'medium' ? 'var(--warning)' : 'inherit' }}>
                              {t.priority === 'high' ? 'Yüksek' : t.priority === 'medium' ? 'Orta' : 'Düşük'}
                            </strong></span>
                            <span>{new Date(t.created_at).toLocaleDateString('tr-TR')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: NEW TICKET FORM */}
            {view === 'new' && (
              <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>Yeni Destek Talebi</span>
                </div>

                {formError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--danger-glow)', borderRadius: '8px', color: 'var(--danger)', fontSize: '11px' }}>
                    <AlertCircle size={14} />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="input-label" style={{ fontSize: '11px' }}>Konu</label>
                  <input
                    className="input"
                    placeholder="Örn: POS Donanım Aktivasyonu, Havale Bildirimi"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                    required
                  />
                </div>

                <div>
                  <label className="input-label" style={{ fontSize: '11px' }}>Öncelik Seviyesi</label>
                  <select
                    className="input"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    style={{ padding: '8px 12px', fontSize: '12px' }}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ fontSize: '11px' }}>Mesajınız</label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Sorunuzu, donanım sipariş detayınızı veya ödeme referansınızı buraya yazınız..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '12px', resize: 'none', minHeight: '100px', height: '100%', fontFamily: 'inherit' }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSaving}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', fontSize: '13px', marginTop: 10 }}
                >
                  {formSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Gönderiliyor...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Talebi İlet</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* VIEW: TICKET DETAILS (CHAT THREAD) */}
            {view === 'detail' && selectedTicket && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setView('list'); setSelectedTicket(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedTicket.subject}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--muted)' }}>
                      Açılış: {new Date(selectedTicket.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Message Threads */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  overflowY: 'auto',
                  paddingRight: 4,
                  marginBottom: 10
                }}>
                  {/* User Message Bubble */}
                  <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                      color: 'white',
                      padding: '10px 14px',
                      borderRadius: '16px 16px 2px 16px',
                      fontSize: '12px',
                      lineHeight: 1.4,
                      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)'
                    }}>
                      {selectedTicket.message}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--muted)', textAlign: 'right', marginTop: 4 }}>
                      Siz
                    </div>
                  </div>

                  {/* Combined User and Support Replies */}
                  {getSelectedTicketReplies().map((reply: any) => {
                    const isUser = reply.action === 'support_ticket_user_replied';
                    return (
                      <div key={reply.id} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        <div style={{
                          background: isUser ? 'linear-gradient(135deg, var(--accent), #4f46e5)' : 'var(--card-hover)',
                          border: isUser ? 'none' : '1px solid var(--border)',
                          color: isUser ? 'white' : 'var(--foreground)',
                          padding: '10px 14px',
                          borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          fontSize: '12px',
                          lineHeight: 1.4,
                          boxShadow: isUser ? '0 2px 8px rgba(79, 70, 229, 0.15)' : 'none'
                        }}>
                          {reply.metadata?.reply_message || 'Yanıt içeriği boş.'}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--muted)', textAlign: isUser ? 'right' : 'left', marginTop: 4 }}>
                          {isUser ? 'Siz' : 'Destek Ekibi'} • {new Date(reply.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Form Footer */}
                <div style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  {/* Status Indicator */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {selectedTicket.status === 'pending' ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '10px',
                        color: 'var(--warning)',
                        background: 'var(--warning-glow)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        <Clock size={10} />
                        Talebiniz inceleniyor.
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '10px',
                        color: 'var(--success-light)',
                        background: 'var(--success-glow)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        <CheckCircle size={10} />
                        Talep çözüldü.
                      </span>
                    )}
                  </div>

                  {/* Message Reply Form */}
                  <form onSubmit={handleSendReply} style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Mesajınızı yazın..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={replySaving}
                      style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '8px' }}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={replySaving || !replyText.trim()}
                      style={{ padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {replySaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
