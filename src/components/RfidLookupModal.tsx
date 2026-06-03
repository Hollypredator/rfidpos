'use client';

import React, { useState, useEffect } from 'react';
import {
  X, CreditCard, User, DoorOpen, Plus, Check, Loader2, ArrowUpRight,
  ArrowDownRight, Clock, AlertCircle, RefreshCw, LogOut, Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '../utils/supabase';
import { Guest, Room, Transaction } from '../types';

interface RfidLookupModalProps {
  cardUid: string | null;
  onClose: () => void;
  onRefreshStats?: () => void;
}

export default function RfidLookupModal({ cardUid, onClose, onRefreshStats }: RfidLookupModalProps) {
  const { tenant } = useAuth();
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [guest, setGuest] = useState<Guest | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [recentTxs, setRecentTxs] = useState<(Transaction & { performer_name?: string })[]>([]);

  // Form states
  const [topupAmount, setTopupAmount] = useState<string>('');
  const [topupSuccess, setTopupSuccess] = useState(false);

  // Audio helper
  const playBeep = (type: 'success' | 'error' | 'scan') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(1109, ctx.currentTime); // C#6
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 100);
      } else if (type === 'error') {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3 (low buzz)
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        // scan beep
        osc.frequency.setValueAtTime(1200, ctx.currentTime); // high pitch chirp
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      console.warn('Web Audio API not supported or allowed.', e);
    }
  };

  useEffect(() => {
    if (cardUid) {
      setIsOpen(true);
      fetchCardDetails(cardUid);
    } else {
      setIsOpen(false);
    }
  }, [cardUid]);

  const fetchCardDetails = async (uid: string) => {
    setLoading(true);
    setError(null);
    setGuest(null);
    setRoom(null);
    setRecentTxs([]);
    setTopupAmount('');
    setTopupSuccess(false);

    try {
      playBeep('scan');
      // 1. Find Guest
      const { data: guestsData, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('card_uid', uid);

      if (guestError) throw guestError;

      if (!guestsData || guestsData.length === 0) {
        // Card is unassigned
        setLoading(false);
        return;
      }

      const activeGuest = guestsData[0] as Guest;
      setGuest(activeGuest);

      // 2. Find Room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', activeGuest.room_id)
        .single();

      if (roomError) throw roomError;
      setRoom(roomData);

      // 3. Find Room Transactions
      const { data: txsData, error: txsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('room_id', activeGuest.room_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (txsError) throw txsError;
      setRecentTxs(txsData || []);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Kart detayları yüklenemedi.');
      playBeep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async (amountStr: string) => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || !room || !tenant?.id) {
      setError('Lütfen geçerli bir yükleme tutarı giriniz.');
      playBeep('error');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          tenant_id: tenant.id,
          room_id: room.id,
          guest_id: guest?.id || null,
          amount: amount,
          type: 'topup',
          location: 'reception',
          description: 'Resepsiyon RFID Okuyucu ile Bakiye Yükleme',
          performed_by: 'mock-receptionist-id' // default receptionist mock id
        });

      if (txError) throw txError;

      playBeep('success');
      setTopupSuccess(true);
      setTopupAmount('');
      
      // Reload room and transaction details
      setTimeout(() => {
        if (cardUid) fetchCardDetails(cardUid);
        if (onRefreshStats) onRefreshStats();
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Bakiye yüklenirken hata oluştu.');
      playBeep('error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!room || !guest) return;
    const confirmMsg = `Oda ${room.room_number} (${guest.guest_name}) için Check-out yapılacak ve kalan ₺${Number(room.wallet_balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} iade edilecektir. Onaylıyor musunuz?`;
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    setError(null);

    try {
      const remainingBalance = Number(room.wallet_balance);

      // 1. If there's remaining balance, record a refund transaction to empty the room wallet
      if (remainingBalance > 0) {
        await supabase
          .from('transactions')
          .insert({
            tenant_id: tenant?.id || 'mock-tenant-id',
            room_id: room.id,
            guest_id: guest.id,
            amount: remainingBalance,
            type: 'charge', // charging the room wallet to 0 balance
            location: 'reception',
            description: 'Check-out Bakiye İadesi / Sıfırlama',
            performed_by: 'mock-receptionist-id'
          });
      }

      // 2. Set Room Status to checked_out and balance to 0
      const { error: roomErr } = await supabase
        .from('rooms')
        .update({
          status: 'checked_out',
          wallet_balance: 0
        })
        .eq('id', room.id);

      if (roomErr) throw roomErr;

      // 3. Deactivate or delete guest
      const { error: guestErr } = await supabase
        .from('guests')
        .delete()
        .eq('id', guest.id);

      if (guestErr) throw guestErr;

      playBeep('success');
      alert('Check-out işlemi başarıyla tamamlandı. RFID kart boşa çıkarıldı ve havuza iade edildi.');
      
      if (onRefreshStats) onRefreshStats();
      handleClose();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Check-out yapılırken hata oluştu.');
      playBeep('error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 999 }} onClick={handleClose}>
      <div 
        className="modal-content glass-card" 
        style={{ 
          maxWidth: 550, 
          padding: 24, 
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.95)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          borderRadius: 24
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <CreditCard size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Hızlı Kart Sorgulama</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>UID: <span className="font-mono text-indigo-400">{cardUid}</span></p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="btn btn-ghost"
            style={{ padding: 6, minWidth: 'auto', borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--accent)' }} />
            <p style={{ fontWeight: 500 }}>Kart verileri sorgulanıyor...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
            <h4 style={{ fontSize: 16, fontWeight: 650, marginBottom: 8 }}>Sorgulama Hatası</h4>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>{error}</p>
            <button className="btn btn-primary" onClick={() => cardUid && fetchCardDetails(cardUid)}>Tekrar Dene</button>
          </div>
        ) : !guest ? (
          /* Unassigned Card State */
          <div style={{ padding: '30px 0', textAlign: 'center' }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', 
              background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <AlertCircle size={32} style={{ color: '#f59e0b' }} />
            </div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#f59e0b' }}>Tanımsız Kart Havuzu</h4>
            <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.5 }}>
              Bu RFID kart (`{cardUid}`) şu an hiçbir aktif misafire veya odaya tanımlı değildir. Havuzda boşta beklemektedir.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={handleClose}>Kapat</button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  handleClose();
                  window.location.href = `/dashboard/guests?scanUid=${cardUid}`;
                }}
              >
                Yeni Misafire Tanımla
              </button>
            </div>
          </div>
        ) : (
          /* Card Found (Active Guest & Room) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Quick Guest Info */}
            <div style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: 16, 
              padding: 16,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12
            }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Aktif Misafir</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <User size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 650, fontSize: 14 }}>{guest.guest_name}</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Oda Numarası</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <DoorOpen size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 650, fontSize: 14 }}>Oda {room?.room_number || '—'}</span>
                </div>
              </div>
            </div>

            {/* Wallet Balance Display */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.05))',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 20,
              padding: '20px 24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <span style={{ fontSize: 12, color: 'var(--accent-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mevcut Oda Bakiyesi</span>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'white', marginTop: 6, fontFamily: 'monospace' }}>
                ₺{Number(room?.wallet_balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Balance Load (Top-up) Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Bakiye Yükleme (Top-up)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  className="input" 
                  type="number" 
                  placeholder="Yüklenecek tutar (₺)..." 
                  value={topupAmount} 
                  onChange={(e) => setTopupAmount(e.target.value)} 
                  style={{ flex: 1, height: 44 }}
                  disabled={actionLoading || topupSuccess}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleTopup(topupAmount)}
                  disabled={actionLoading || !topupAmount || topupSuccess}
                  style={{ height: 44, padding: '0 20px' }}
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Yükle
                </button>
              </div>

              {/* Fast Load Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
                {['100', '250', '500', '1000'].map((amt) => (
                  <button
                    key={amt}
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleTopup(amt)}
                    disabled={actionLoading || topupSuccess}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}
                  >
                    +₺{amt}
                  </button>
                ))}
              </div>

              {/* Topup success alert */}
              {topupSuccess && (
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, 
                  padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', 
                  border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', 
                  borderRadius: 12, fontSize: 13, marginTop: 8 
                }}>
                  <Check size={16} />
                  Bakiye başarıyla yüklendi! Güncelleniyor...
                </div>
              )}
            </div>

            {/* Recent Transactions List */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Odaya Ait Son İşlemler</label>
              <div style={{ 
                border: '1px solid rgba(255,255,255,0.05)', 
                borderRadius: 16, 
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.2)'
              }}>
                {recentTxs.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    Bu odaya ait henüz işlem kaydı bulunmuyor.
                  </div>
                ) : (
                  recentTxs.map((tx) => (
                    <div 
                      key={tx.id} 
                      style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: tx.type === 'charge' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: tx.type === 'charge' ? 'var(--danger)' : 'var(--success)'
                        }}>
                          {tx.type === 'charge' ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {tx.type === 'charge' ? 'Harcama' : tx.type === 'topup' ? 'Yükleme' : 'İade'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                            {tx.location} • {new Date(tx.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: tx.type === 'charge' ? 'var(--danger)' : 'var(--success)' }}>
                        {tx.type === 'charge' ? '-' : '+'}₺{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Check-out Action Button */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, marginTop: 8, display: 'flex', gap: 12 }}>
              <button 
                className="btn btn-ghost" 
                onClick={handleClose} 
                style={{ flex: 1 }}
                disabled={actionLoading}
              >
                Kapat
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={handleCheckout}
                disabled={actionLoading}
                style={{ 
                  flex: 1, 
                  color: 'var(--danger)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  background: 'rgba(239, 68, 68, 0.05)'
                }}
              >
                <LogOut size={16} style={{ marginRight: 6 }} />
                Check-out Yap
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
