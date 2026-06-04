'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ConciergeBell, DoorOpen, User, CreditCard, Plus, Check, Loader2,
  Printer, LogOut, RefreshCw, AlertCircle, Key, Wallet, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { createClient } from '../../../utils/supabase';
import { Room, Guest, Transaction } from '../../../types';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../contexts/ToastContext';

function ReceptionPageContent() {
  const { tenant, profile } = useAuth();
  const supabase = createClient();
  const t = useTerminology();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const scanUidParam = searchParams?.get('scanUid') || '';

  // Master Data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Check-in Form States
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [cardUid, setCardUid] = useState('');
  const [pinCode, setPinCode] = useState('1234');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [loadingCheckin, setLoadingCheckin] = useState(false);
  const [errorCheckin, setErrorCheckin] = useState<string | null>(null);
  const [successCheckin, setSuccessCheckin] = useState(false);

  // Check-out / Folio States
  const [selectedCheckoutRoomId, setSelectedCheckoutRoomId] = useState('');
  const [checkoutGuest, setCheckoutGuest] = useState<Guest | null>(null);
  const [checkoutRoom, setCheckoutRoom] = useState<Room | null>(null);
  const [checkoutTransactions, setCheckoutTransactions] = useState<Transaction[]>([]);
  const [loadingCheckoutData, setLoadingCheckoutData] = useState(false);
  const [errorCheckout, setErrorCheckout] = useState<string | null>(null);
  const [loadingCheckoutSubmit, setLoadingCheckoutSubmit] = useState(false);
  const [successCheckout, setSuccessCheckout] = useState(false);

  // Mobile active tab
  const [activeTab, setActiveTab] = useState<'checkin' | 'checkout'>('checkin');

  // Audio helper
  const playBeep = (type: 'success' | 'error' | 'scan') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(1109, ctx.currentTime);
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 100);
      } else if (type === 'error') {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  // Fetch all rooms
  const fetchRooms = async () => {
    if (!tenant?.id) return;
    setLoadingRooms(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('room_number');
      if (!error) {
        setRooms(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();

    // Listen to custom DB update triggers
    const handleDbUpdate = () => {
      fetchRooms();
    };
    window.addEventListener('rfid-db-updated', handleDbUpdate);
    return () => {
      window.removeEventListener('rfid-db-updated', handleDbUpdate);
    };
  }, [tenant?.id]);

  // Set deposit amount from tenant settings
  useEffect(() => {
    if (tenant?.settings) {
      const depAmt = (tenant.settings as any)?.deposit_amount || 0;
      setDepositAmount(depAmt);
    }
  }, [tenant?.settings]);

  // Load URL query param scanUid if present
  useEffect(() => {
    if (scanUidParam) {
      setCardUid(scanUidParam);
      playBeep('scan');
    }
  }, [scanUidParam]);

  // Android Javascript Bridge Listener
  useEffect(() => {
    const handleAndroidCard = (uid: string) => {
      setCardUid(uid);
      playBeep('scan');
    };
    (window as any).handleRFIDCard = handleAndroidCard;
    return () => {
      delete (window as any).handleRFIDCard;
    };
  }, []);

  // Fetch details for room selection in checkout folio
  useEffect(() => {
    if (selectedCheckoutRoomId) {
      fetchCheckoutRoomData(selectedCheckoutRoomId);
    } else {
      setCheckoutGuest(null);
      setCheckoutRoom(null);
      setCheckoutTransactions([]);
    }
  }, [selectedCheckoutRoomId]);

  const fetchCheckoutRoomData = async (roomId: string) => {
    setLoadingCheckoutData(true);
    setErrorCheckout(null);
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (roomError) throw roomError;
      setCheckoutRoom(roomData);

      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'active');
      if (guestError) throw guestError;

      if (guestData && guestData.length > 0) {
        setCheckoutGuest(guestData[0]);
      } else {
        setCheckoutGuest(null);
      }

      const { data: txsData, error: txsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });
      if (txsError) throw txsError;
      setCheckoutTransactions(txsData || []);
    } catch (err: any) {
      console.error(err);
      setErrorCheckout(err.message || 'Folyo detayları yüklenemedi.');
    } finally {
      setLoadingCheckoutData(false);
    }
  };

  // Submit Check-in
  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;

    // Check if NFC is enabled on Android
    if (typeof window !== 'undefined' && (window as any).AndroidBridge && typeof (window as any).AndroidBridge.checkNfcStatus === 'function') {
      const nfcStatus = (window as any).AndroidBridge.checkNfcStatus();
      if (nfcStatus === 'disabled') {
        setErrorCheckin('Cihazınızın NFC özelliği kapalıdır. Lütfen ayarlardan NFC özelliğini etkinleştirin.');
        playBeep('error');
        return;
      }
    }

    if (!selectedRoomId) {
      setErrorCheckin(`Lütfen bir ${t.roomLabel.toLowerCase()} seçin.`);
      playBeep('error');
      return;
    }
    if (!guestName.trim()) {
      setErrorCheckin(`Lütfen ${t.guestLabel.toLowerCase()} adını girin.`);
      playBeep('error');
      return;
    }
    if (!cardUid.trim()) {
      setErrorCheckin('Lütfen RFID kart kodunu girin veya okutun.');
      playBeep('error');
      return;
    }
    if (!/^[0-9]{4}$/.test(pinCode)) {
      setErrorCheckin('PIN kodu 4 rakam olmalıdır.');
      playBeep('error');
      return;
    }

    setLoadingCheckin(true);
    setErrorCheckin(null);
    setSuccessCheckin(false);

    try {
      // Check duplicate active card
      const { data: existingGuest, error: existingError } = await supabase
        .from('guests')
        .select('*')
        .eq('card_uid', cardUid.trim())
        .eq('status', 'active');

      if (existingGuest && existingGuest.length > 0) {
        throw new Error(`Bu RFID kartı zaten başka bir misafire tanımlı!`);
      }

      // Update room status
      const { error: roomError } = await supabase
        .from('rooms')
        .update({
          status: 'occupied',
          pin_code: pinCode,
          wallet_balance: 0 // trigger will increment this
        })
        .eq('id', selectedRoomId);
      if (roomError) throw roomError;

      // Create guest
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .insert({
          room_id: selectedRoomId,
          guest_name: guestName.trim(),
          card_uid: cardUid.trim(),
          status: 'active'
        })
        .select();
      if (guestError) throw guestError;
      const createdGuest = guestData?.[0];

      // Initial Top-up
      const initialAmt = parseFloat(String(initialBalance));
      if (!isNaN(initialAmt) && initialAmt > 0) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            tenant_id: tenant.id,
            room_id: selectedRoomId,
            guest_id: createdGuest?.id || null,
            amount: initialAmt,
            type: 'topup',
            location: 'reception',
            description: 'Giriş Esnası İlk Bakiye Yükleme',
            performed_by: profile?.id || null
          });
        if (txError) throw txError;
      }

      // Deposit transaction (if configured)
      const depAmt = parseFloat(String(depositAmount));
      if (!isNaN(depAmt) && depAmt > 0) {
        const { error: depError } = await supabase
          .from('transactions')
          .insert({
            tenant_id: tenant.id,
            room_id: selectedRoomId,
            guest_id: createdGuest?.id || null,
            amount: depAmt,
            type: 'deposit',
            location: 'reception',
            description: `${t.depositLabel} Tahsilatı`,
            performed_by: profile?.id || null
          });
        if (depError) throw depError;
      }

      playBeep('success');
      toast({ message: `${t.checkInLabel} başarıyla tamamlandı!`, type: 'success' });
      setSuccessCheckin(true);
      setGuestName('');
      setCardUid('');
      setPinCode('1234');
      setInitialBalance(0);
      setSelectedRoomId('');

      // Refresh rooms and layouts
      await fetchRooms();
      window.dispatchEvent(new CustomEvent('rfid-db-updated'));

      setTimeout(() => setSuccessCheckin(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorCheckin(err.message || 'Giriş yapılamadı.');
      toast({ message: err.message || 'Giriş işlemi başarısız!', type: 'error' });
      playBeep('error');
    } finally {
      setLoadingCheckin(false);
    }
  };

  // Submit Check-out
  const handleCheckoutSubmit = async () => {
    if (!checkoutRoom || !tenant?.id) return;
    const balance = Number(checkoutRoom.wallet_balance);
    const guestInfo = checkoutGuest ? ` (${checkoutGuest.guest_name})` : '';
    const confirmMsg = `${t.roomLabel} ${checkoutRoom.room_number}${guestInfo} için çıkış yapılacak ve kalan ₺${balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} iade edilecektir. Onaylıyor musunuz?`;
    if (!confirm(confirmMsg)) return;

    setLoadingCheckoutSubmit(true);
    setErrorCheckout(null);

    try {
      // Zero out the room balance if any
      if (balance > 0) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            tenant_id: tenant.id,
            room_id: checkoutRoom.id,
            guest_id: checkoutGuest?.id || null,
            amount: balance,
            type: 'charge',
            location: 'reception',
            description: 'Check-out Bakiye İadesi',
            performed_by: profile?.id || null
          });
        if (txError) throw txError;
      }

      // Refund deposit if applicable
      const tenantDepositAmt = (tenant.settings as any)?.deposit_amount || 0;
      if (tenantDepositAmt > 0) {
        const { error: depRefundError } = await supabase
          .from('transactions')
          .insert({
            tenant_id: tenant.id,
            room_id: checkoutRoom.id,
            guest_id: checkoutGuest?.id || null,
            amount: tenantDepositAmt,
            type: 'deposit_refund',
            location: 'reception',
            description: `${t.depositLabel} İadesi`,
            performed_by: profile?.id || null
          });
        if (depRefundError) throw depRefundError;
      }

      // Update room to checked_out
      const { error: roomError } = await supabase
        .from('rooms')
        .update({
          status: 'checked_out',
          wallet_balance: 0
        })
        .eq('id', checkoutRoom.id);
      if (roomError) throw roomError;

      // Delete guest (frees card UID)
      if (checkoutGuest) {
        const { error: guestError } = await supabase
          .from('guests')
          .delete()
          .eq('id', checkoutGuest.id);
        if (guestError) throw guestError;
      }

      playBeep('success');
      toast({ message: `${t.checkOutLabel} başarıyla tamamlandı! Bakiye ve depozito iade edildi.`, type: 'success' });
      setSuccessCheckout(true);
      setCheckoutGuest(null);
      setCheckoutRoom(null);
      setCheckoutTransactions([]);
      setSelectedCheckoutRoomId('');

      // Refresh rooms and layouts
      await fetchRooms();
      window.dispatchEvent(new CustomEvent('rfid-db-updated'));

      setTimeout(() => setSuccessCheckout(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorCheckout(err.message || 'Çıkış sırasında hata oluştu.');
      toast({ message: err.message || 'Çıkış işlemi başarısız!', type: 'error' });
      playBeep('error');
    } finally {
      setLoadingCheckoutSubmit(false);
    }
  };

  // Trigger Print using the bridge or window.print()
  const handlePrint = () => {
    if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.printPage === 'function') {
      (window as any).AndroidBridge.printPage();
    } else {
      window.print();
    }
  };

  // Filter vacant and occupied rooms
  const vacantRooms = rooms.filter(r => r.status === 'active' || r.status === 'checked_out');
  const occupiedRooms = rooms.filter(r => r.status === 'occupied');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Title */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            <ConciergeBell size={22} />
          </div>
          <div>
            <h1 className="page-title">{t.receptionLabel} İşlemleri</h1>
            <p className="page-subtitle">{t.receptionDesc}</p>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher for Reception */}
      <div className="md:hidden flex bg-card/65 backdrop-blur-md border border-border p-1 rounded-2xl w-full mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('checkin')}
          className={`flex-1 py-3 text-center rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'checkin'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <DoorOpen size={16} />
          {t.checkInLabel}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('checkout')}
          className={`flex-1 py-3 text-center rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'checkout'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <LogOut size={16} />
          {t.checkOutLabel}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        
        {/* Left Side: Check-in / Kart Kodlama */}
        <div 
          className={`glass-card ${activeTab === 'checkin' ? 'flex' : 'hidden md:flex'}`} 
          style={{ padding: 24, flexDirection: 'column', gap: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
            <DoorOpen size={20} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t.checkInLabel}</h3>
          </div>

          {successCheckin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', borderRadius: 12, fontSize: 14 }}>
              <Check size={18} />
              Giriş işlemi başarıyla tamamlandı, kart tanımlandı!
            </div>
          )}

          {errorCheckin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: 12, fontSize: 14 }}>
              <AlertCircle size={18} />
              {errorCheckin}
            </div>
          )}

          <form onSubmit={handleCheckinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Room selection */}
            <div>
              <label className="input-label">{t.roomLabel} Seçimi</label>
              {loadingRooms ? (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t.roomsLabel} yükleniyor...</div>
              ) : (
                <select
                  className="input"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  required
                >
                  <option value="">-- Boş {t.roomLabel} Seçin --</option>
                  {vacantRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {t.roomLabel} {room.room_number} (Boş)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Guest Name */}
            <div>
              <label className="input-label">{t.guestNameLabel}</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  className="input"
                  placeholder={`${t.guestLabel} adını giriniz...`}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
            </div>

            {/* Card UID */}
            <div>
              <label className="input-label">RFID Kart Numarası (UID)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <CreditCard size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input
                    className="input"
                    placeholder="Kartı okutun veya elle girin..."
                    value={cardUid}
                    onChange={(e) => setCardUid(e.target.value.toUpperCase())}
                    style={{ paddingLeft: 38 }}
                    required
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const randomHex = Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase();
                    setCardUid(randomHex);
                    playBeep('scan');
                  }}
                  style={{ fontSize: 12, padding: '0 12px' }}
                  title="Test amacıyla rastgele UID üretir"
                >
                  Simüle Et
                </button>
              </div>
              <small style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4, display: 'block' }}>
                Cihazınızdaki RFID/NFC okuyucuya bir kart yaklaştırarak da bu alanı otomatik doldurabilirsiniz.
              </small>
            </div>

            {/* PIN Code */}
            <div>
              <label className="input-label">{t.pinLabel} (Harcama Şifresi - 4 Hane)</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  className="input"
                  maxLength={4}
                  placeholder="1234"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  style={{ paddingLeft: 38 }}
                  required
                />
              </div>
            </div>

            {/* Initial balance load */}
            <div>
              <label className="input-label">İlk Yükleme Tutarı (₺ - İsteğe Bağlı)</label>
              <div style={{ position: 'relative' }}>
                <Wallet size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={initialBalance || ''}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                  style={{ paddingLeft: 38 }}
                />
              </div>
            </div>

            {/* Deposit Amount */}
            {depositAmount > 0 && (
              <div>
                <label className="input-label">{t.depositLabel} (₺)</label>
                <div style={{ position: 'relative' }}>
                  <Wallet size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--warning)' }} />
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="any"
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    style={{ paddingLeft: 38 }}
                  />
                </div>
                <small style={{ color: 'var(--warning)', fontSize: 11, marginTop: 4, display: 'block' }}>
                  ℹ️ {t.depositDesc} — çıkışta iade edilecektir.
                </small>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loadingCheckin}
              style={{ marginTop: 10, width: '100%', height: 46 }}
            >
              {loadingCheckin ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  İşlem Kaydediliyor...
                </>
              ) : (
                <>
                  <Check size={18} />
                  İşlemi Tamamla
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Check-out / Adisyon Folyo */}
        <div 
          className={`glass-card ${activeTab === 'checkout' ? 'flex' : 'hidden md:flex'}`} 
          style={{ padding: 24, flexDirection: 'column', gap: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
            <LogOut size={20} style={{ color: 'var(--danger)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t.checkOutLabel}</h3>
          </div>

          {successCheckout && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', borderRadius: 12, fontSize: 14 }}>
              <Check size={18} />
              İşlem başarıyla yapıldı. Kalan bakiye iade edildi ve kart boşa çıkarıldı!
            </div>
          )}

          {/* Select Occupied Room */}
          <div>
            <label className="input-label">Aktif {t.roomLabel} Seçimi</label>
            {loadingRooms ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t.roomsLabel} yükleniyor...</div>
            ) : (
              <select
                className="input"
                value={selectedCheckoutRoomId}
                onChange={(e) => setSelectedCheckoutRoomId(e.target.value)}
              >
                <option value="">-- Aktif {t.roomLabel} Seçin --</option>
                {occupiedRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {t.roomLabel} {room.room_number} ({room.wallet_balance > 0 ? `Bakiye: ₺${Number(room.wallet_balance).toFixed(2)}` : 'Bakiye Yok'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {loadingCheckoutData ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              Detaylar yükleniyor...
            </div>
          ) : !checkoutRoom ? (
            /* Empty State */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '60px 20px', border: '1px dashed var(--border)', borderRadius: 16, color: 'var(--muted)', textAlign: 'center'
            }}>
              <ConciergeBell size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Harcama detaylarını görüntülemek ve çıkış işlemlerini başlatmak için yukarıdan aktif bir {t.roomLabel.toLowerCase()} seçin.</p>
            </div>
          ) : (
            /* Occupied Room details and Folio */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Printable receipt structure container */}
              <div id="print-section" className="glass-card" style={{ padding: 16, background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16 }}>
                {/* Folio Print Header (Only visible during print) */}
                <div className="print-header" style={{ display: 'none', borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>{tenant?.name || `RFID POS ${t.tenantLabel.toUpperCase()}`}</div>
                  <div style={{ fontSize: 12, textAlign: 'center', color: '#666' }}>{tenant?.address || ''} • {tenant?.phone || ''}</div>
                  <div style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginTop: 10 }}>ADİSYON DETAYI (FOLYO)</div>
                </div>

                {/* Info block */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, marginBottom: 14 }}>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>{t.guestLabel} Adı</span>
                    <strong style={{ fontSize: 14 }}>{checkoutGuest?.guest_name || `Kayıtsız ${t.guestLabel}`}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>{t.roomLabel} / Kart</span>
                    <strong style={{ fontSize: 14 }}>{t.roomLabel} {checkoutRoom.room_number} <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'monospace' }}>({checkoutGuest?.card_uid || 'Kart Yok'})</span></strong>
                  </div>
                </div>

                {/* Balance display */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.02))',
                  border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 12, padding: '12px 16px', textAlign: 'center', marginBottom: 16
                }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>{t.roomBalanceLabel} (İade Edilecek)</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)', fontFamily: 'monospace', marginTop: 4 }}>
                    ₺{Number(checkoutRoom.wallet_balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Folio Transactions Table */}
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 8 }}>İşlem Detayları</span>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', textAlign: 'left' }}>
                          <th style={{ padding: '6px 4px' }}>Tarih</th>
                          <th style={{ padding: '6px 4px' }}>Yer / Tür</th>
                          <th style={{ padding: '6px 4px', textAlign: 'right' }}>Tutar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkoutTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={3} style={{ padding: 12, textAlign: 'center', color: 'var(--muted)' }}>Bu hesaba ait işlem geçmişi yok.</td>
                          </tr>
                        ) : (
                          checkoutTransactions.map((tx) => (
                            <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '6px 4px', color: 'var(--muted)' }}>
                                {new Date(tx.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })} {new Date(tx.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '6px 4px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 600 }}>{tx.location}</span>
                                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                                    {tx.type === 'charge' ? 'Harcama' : tx.type === 'topup' ? 'Yükleme' : 'İade'} {tx.description ? ` - ${tx.description}` : ''}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, color: tx.type === 'charge' ? 'var(--danger)' : 'var(--success)' }}>
                                {tx.type === 'charge' ? '-' : '+'}₺{Number(tx.amount).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Print Footer Signature Line (Only visible during print) */}
                <div className="print-footer" style={{ display: 'none', marginTop: 30, borderTop: '1px dashed #999', paddingTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <div>
                      <div>{t.guestLabel} İmzası:</div>
                      <div style={{ height: 40 }}></div>
                      <div>_____________________</div>
                    </div>
                    <div>
                      <div>Görevli İmzası:</div>
                      <div style={{ height: 40 }}></div>
                      <div>_____________________</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 20 }}>
                    RFID POS {t.tenantLabel} Otomasyonu üzerinden yazdırılmıştır.
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handlePrint}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Printer size={16} />
                  Folyo Yazdır
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleCheckoutSubmit}
                  disabled={loadingCheckoutSubmit}
                  style={{
                    flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--danger)'
                  }}
                >
                  {loadingCheckoutSubmit ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LogOut size={16} />
                  )}
                  {t.roomLabel === 'Oda' ? 'Çıkış Yap & Kartı Bırak' : 'Kartı İade Al & Kapat'}
                </button>
              </div>

              {errorCheckout && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: 12, fontSize: 13, marginTop: 8 }}>
                  <AlertCircle size={16} />
                  {errorCheckout}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Global CSS style block for printing aesthetics */}
      <style jsx global>{`
        @media print {
          /* Hide sidebar, dashboard contents, header, scrollbars, etc. */
          body * {
            visibility: hidden;
            background: white !important;
            color: black !important;
          }
          /* Show print section only */
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            background: white !important;
            box-shadow: none !important;
            padding: 10px !important;
            color: black !important;
          }
          .print-header, .print-footer {
            display: block !important;
            color: black !important;
          }
          /* Override background graphics */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function ReceptionPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--muted)' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent)' }} />
        <span style={{ marginLeft: 8 }}>Resepsiyon Paneli Yükleniyor...</span>
      </div>
    }>
      <ReceptionPageContent />
    </Suspense>
  );
}
