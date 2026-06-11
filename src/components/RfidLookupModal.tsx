'use client';

import React, { useState, useEffect } from 'react';
import {
  X, CreditCard, User, DoorOpen, Plus, Check, Loader2, ArrowUpRight,
  ArrowDownRight, Clock, AlertCircle, RefreshCw, LogOut, Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '../utils/supabase';
import { Guest, Room, Transaction } from '../types';
import { useTerminology } from '../hooks/useTerminology';

interface RfidLookupModalProps {
  cardUid: string | null;
  onClose: () => void;
  onRefreshStats?: () => void;
}

export default function RfidLookupModal({ cardUid, onClose, onRefreshStats }: RfidLookupModalProps) {
  const { tenant } = useAuth();
  const supabase = createClient();
  const t = useTerminology();

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
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [manualUid, setManualUid] = useState<string>('');

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
      if (cardUid !== 'manual') {
        setActiveUid(cardUid);
        fetchCardDetails(cardUid);
      } else {
        setActiveUid(null);
        setGuest(null);
        setRoom(null);
        setRecentTxs([]);
        setLoading(false);
        setTopupAmount('');
        setTopupSuccess(false);
      }
    } else {
      setIsOpen(false);
    }
  }, [cardUid]);

  const fetchCardDetails = async (uid: string) => {
    setActiveUid(uid);
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
        .eq('tenant_id', tenant?.id)
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

  const handleManualSearch = () => {
    if (manualUid.trim()) {
      setActiveUid(manualUid.trim());
      fetchCardDetails(manualUid.trim());
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
          description: `${t.receptionLabel} RFID Okuyucu ile Bakiye Yükleme`,
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
    const confirmMsg = `${t.roomLabel} ${room.room_number} (${guest.guest_name}) için ${t.checkOutLabel} yapılacak ve kalan ₺${Number(room.wallet_balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} iade edilecektir. Onaylıyor musunuz?`;
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
            description: `${t.checkOutLabel} Bakiye İadesi / Sıfırlama`,
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
      alert(`${t.checkOutLabel} işlemi başarıyla tamamlandı. RFID kart boşa çıkarıldı ve havuza iade edildi.`);
      
      if (onRefreshStats) onRefreshStats();
      handleClose();

    } catch (err: any) {
      console.error(err);
      setError(err.message || `${t.checkOutLabel} yapılırken hata oluştu.`);
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
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes nfc-pulse {
            0% { transform: scale(0.9); opacity: 0.1; }
            50% { transform: scale(1.1); opacity: 0.6; }
            100% { transform: scale(1.3); opacity: 0; }
          }
          @keyframes card-float {
            0% { transform: translateY(12px) rotate(-1deg); }
            50% { transform: translateY(-4px) rotate(2deg); }
            100% { transform: translateY(12px) rotate(-1deg); }
          }
          @keyframes glow-led {
            0%, 100% { opacity: 0.4; filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.4)); }
            50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.9)); }
          }
        `}} />
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
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                {activeUid ? (
                  <>UID: <span className="font-mono text-indigo-400">{activeUid}</span></>
                ) : (
                  'Manuel Arama veya Kart Okutun'
                )}
              </p>
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
        ) : cardUid === 'manual' && !activeUid && !guest && !error ? (
          /* Manual Search Input Mode with Premium Visual Indicators */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '10px 0' }}>
            
            {/* 1. Interactive Physical Scanner Mockup Panel */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '28px 24px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 20,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.2)'
            }}>
              {/* Green active LED status dot */}
              <div style={{
                position: 'absolute',
                top: 14,
                left: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 10,
                color: 'var(--success-light)',
                fontWeight: 700,
                letterSpacing: '0.05em'
              }}>
                <span style={{ 
                  width: 6, 
                  height: 6, 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--success)', 
                  display: 'inline-block',
                  animation: 'glow-led 1.5s infinite'
                }} />
                OKUYUCU AKTİF
              </div>

              {/* Antenna Pulse concentric rings */}
              <div style={{
                width: 90, height: 90,
                borderRadius: '50%',
                border: '1px dashed rgba(99, 102, 241, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                margin: '12px 0 20px'
              }}>
                {/* Concentric rings animating */}
                <div style={{
                  position: 'absolute',
                  width: '100%', height: '100%',
                  borderRadius: '50%',
                  border: '2px solid var(--accent)',
                  animation: 'nfc-pulse 2s linear infinite'
                }} />
                <div style={{
                  position: 'absolute',
                  width: '80%', height: '80%',
                  borderRadius: '50%',
                  border: '1.5px solid var(--accent-light)',
                  animation: 'nfc-pulse 2s linear infinite',
                  animationDelay: '0.6s'
                }} />
                
                {/* Floating RFID Card Graphic */}
                <div style={{
                  position: 'relative',
                  width: 52, height: 34,
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                  boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white',
                  animation: 'card-float 2.5s ease-in-out infinite',
                  zIndex: 2
                }}>
                  <CreditCard size={18} />
                </div>
              </div>

              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-light)', letterSpacing: '0.03em' }}>KARTINIZI OKUTUN</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textAlign: 'center', maxWidth: 300, lineHeight: 1.4 }}>
                Cihazın NFC alanına kartı dokundurun veya aşağıdaki alana manuel giriş yapın.
              </span>
            </div>

            {/* 2. Visual Guide Skeleton Preview Card showing where queried data will appear */}
            <div style={{
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              borderRadius: 20,
              padding: 18,
              background: 'rgba(255, 255, 255, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              position: 'relative'
            }}>
              {/* Watermark Label */}
              <div style={{
                position: 'absolute',
                top: -9,
                left: 18,
                background: 'rgba(15, 23, 42, 0.95)',
                padding: '0 8px',
                fontSize: 9,
                color: 'var(--muted)',
                fontWeight: 700,
                letterSpacing: '0.08em'
              }}>
                TASARIM ŞABLONU ÖNİZLEMESİ
              </div>

              {/* Guest Details Placeholder */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: 12,
                border: '1px dashed rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: 12,
                opacity: 0.5
              }}>
                <div>
                  <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>{t.activeGuestsLabel}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <User size={14} style={{ color: 'var(--muted)' }} />
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{t.guestLabel} İsmi Buraya Gelecek</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>{t.roomNoLabel}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <DoorOpen size={14} style={{ color: 'var(--muted)' }} />
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{t.roomLabel} No Buraya Gelecek</span>
                  </div>
                </div>
              </div>

              {/* Wallet Balance Display Placeholder */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(168, 85, 247, 0.02))',
                border: '1px dashed rgba(99, 102, 241, 0.4)',
                borderRadius: 16,
                padding: '16px 20px',
                textAlign: 'center',
                position: 'relative'
              }}>
                {/* Pointer / Callout Badge */}
                <div style={{
                  position: 'absolute',
                  top: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--accent)',
                  color: 'white',
                  padding: '1px 8px',
                  borderRadius: 4,
                  fontSize: 8,
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  BAKİYE GÖSTERGESİ
                </div>
                <span style={{ fontSize: 10, color: 'var(--accent-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mevcut {t.roomBalanceLabel}</span>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.25)', marginTop: 4, fontFamily: 'monospace' }}>
                  ₺ *,***.**
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, fontStyle: 'italic' }}>
                  Okutulan kartın toplam {t.roomBalanceLabel.toLowerCase()} burada görüntülenecektir.
                </div>
              </div>

              {/* Transactions List Placeholder */}
              <div>
                <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 6 }}>{t.roomLabel} İşlem Geçmişi</span>
                <div style={{ 
                  border: '1px dashed rgba(255,255,255,0.06)', 
                  borderRadius: 12, 
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  opacity: 0.4
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--muted)' }}>• Harcama (Önizleme)</span>
                    <span style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>-₺00,00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--muted)' }}>• Yükleme (Önizleme)</span>
                    <span style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>+₺00,00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual input form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="input-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>MANUEL KART UID GİRİŞİ</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  type="text"
                  placeholder="Örn: A1B2C3D4..."
                  value={manualUid}
                  onChange={(e) => setManualUid(e.target.value.toUpperCase())}
                  style={{ flex: 1, height: 44 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualUid.trim()) {
                      handleManualSearch();
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleManualSearch}
                  disabled={!manualUid.trim()}
                  style={{ height: 44, padding: '0 24px' }}
                >
                  Sorgula
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={handleClose}>İptal</button>
            </div>

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
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#f59e0b' }}>Tanımsız {t.roomLabel} Havuzu</h4>
            <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.5 }}>
              Bu RFID kart (`{cardUid}`) şu an hiçbir aktif {t.guestLabel.toLowerCase()} veya {t.roomLabel.toLowerCase()} tanımına ait değildir. Havuzda boşta beklemektedir.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              {cardUid === 'manual' ? (
                <button 
                  className="btn btn-ghost" 
                  onClick={() => {
                    setActiveUid(null);
                    setGuest(null);
                    setRoom(null);
                    setRecentTxs([]);
                    setManualUid('');
                  }}
                >
                  Yeni Sorgulama
                </button>
              ) : (
                <button className="btn btn-ghost" onClick={handleClose}>Kapat</button>
              )}
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  handleClose();
                  window.location.href = `/dashboard/guests?scanUid=${activeUid || cardUid}`;
                }}
              >
                Yeni {t.guestLabel} Tanımla
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* NFC Reader Continuous Scan Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: 14,
              fontSize: 12,
              color: 'var(--success-light)',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.05)'
            }}>
              <span style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                backgroundColor: 'var(--success)', 
                display: 'inline-block',
                animation: 'glow-led 1.5s infinite'
              }} />
              <span>Temassız Okuyucu Hazır: Yeni bir kartı doğrudan yaklaştırabilirsiniz.</span>
            </div>
            
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
                <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>{t.activeGuestsLabel}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <User size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 650, fontSize: 14 }}>{guest.guest_name}</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>{t.roomNoLabel}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <DoorOpen size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 650, fontSize: 14 }}>{t.roomLabel} {room?.room_number || '—'}</span>
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
              <span style={{ fontSize: 12, color: 'var(--accent-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mevcut {t.roomBalanceLabel}</span>
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
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{t.roomLabel} İşlem Geçmişi</label>
              <div style={{ 
                border: '1px solid rgba(255,255,255,0.05)', 
                borderRadius: 16, 
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.2)'
              }}>
                {recentTxs.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    Bu {t.roomLabel.toLowerCase()} tanımına ait henüz işlem kaydı bulunmuyor.
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
              {cardUid === 'manual' && (
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setActiveUid(null);
                    setGuest(null);
                    setRoom(null);
                    setRecentTxs([]);
                    setManualUid('');
                  }}
                  style={{ flex: 1, border: '1px solid var(--border)' }}
                >
                  Yeni Sorgulama
                </button>
              )}
              <button 
                className="btn btn-ghost" 
                onClick={handleClose} 
                style={{ flex: cardUid === 'manual' ? 1 : 2 }}
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
                {t.checkOutLabel}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
