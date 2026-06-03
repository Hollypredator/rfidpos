'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  ShoppingCart, 
  CreditCard, 
  Trash2, 
  Plus, 
  Minus, 
  Database, 
  Layers, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Home, 
  Info,
  DollarSign,
  Coffee,
  Pizza,
  Sparkles,
  ChevronRight,
  UserCheck,
  LogOut,
  Sun,
  Moon,
  Settings,
  Edit,
  Printer
} from 'lucide-react';
import { createClient } from '../../utils/supabase';
import { OfflineDBService } from '../../services/db';
import { useSync } from '../../hooks/useSync';
import { Room, Guest, Transaction } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import BillingLockScreen from '../../components/BillingLockScreen';

// POS Product Definition
interface Product {
  id: string;
  name: string;
  price: number;
  category: 'beverage' | 'food' | 'dessert' | 'service';
  icon: string;
}

const DEFAULT_PRODUCTS: Product[] = [
  // Beverages
  { id: 'p1', name: 'Türk Kahvesi', price: 45.00, category: 'beverage', icon: '☕' },
  { id: 'p2', name: 'Taze Portakal Suyu', price: 65.00, category: 'beverage', icon: '🍹' },
  { id: 'p3', name: 'Buzlu Latte', price: 75.00, category: 'beverage', icon: '🥤' },
  { id: 'p4', name: 'Efes Pilsen 33cl', price: 95.00, category: 'beverage', icon: '🍺' },
  { id: 'p5', name: 'Margarita Kokteyl', price: 180.00, category: 'beverage', icon: '🍸' },
  
  // Food
  { id: 'p6', name: 'Karışık Pizza', price: 210.00, category: 'food', icon: '🍕' },
  { id: 'p7', name: 'Club Sandviç', price: 140.00, category: 'food', icon: '🥪' },
  { id: 'p8', name: 'Köfte Tabak', price: 240.00, category: 'food', icon: '🍖' },
  { id: 'p9', name: 'Sezar Salata', price: 130.00, category: 'food', icon: '🥗' },

  // Desserts
  { id: 'p10', name: 'Çikolatalı Sufle', price: 85.00, category: 'dessert', icon: '🧁' },
  { id: 'p11', name: 'Tiramisu', price: 90.00, category: 'dessert', icon: '🍰' },
  { id: 'p12', name: 'Meyve Tabağı', price: 120.00, category: 'dessert', icon: '🍉' },

  // Services
  { id: 'p13', name: 'Spa Masajı (30dk)', price: 650.00, category: 'service', icon: '💆' },
  { id: 'p14', name: 'Kuru Temizleme', price: 150.00, category: 'service', icon: '🧺' },
];

export default function POSPage() {
  const { tenant, profile, signOut, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const tenantId = tenant?.id || 'mock-tenant-id';

  useEffect(() => {
    if (profile && profile.role === 'super_admin') {
      router.push('/superadmin');
    }
  }, [profile, router]);

  useEffect(() => {
    if (profile) {
      setActiveStaff(profile);
    }
  }, [profile]);

  const fetchStaffList = async () => {
    if (!tenantId || tenantId === 'mock-tenant-id') return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      if (!error && data) {
        setStaffList(data);
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, [tenantId]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const [location, setLocation] = useState<'bar' | 'spa' | 'restaurant' | 'reception'>('restaurant');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // Product state
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    category: 'beverage' as Product['category'],
    icon: '☕'
  });

  // Staff Switcher States
  const [staffList, setStaffList] = useState<any[]>([]);
  const [activeStaff, setActiveStaff] = useState<any | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Mobile navigation state
  const [activeMobileTab, setActiveMobileTab] = useState<'menu' | 'cart'>('menu');

  // Load products from localStorage or default
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rfid_pos_products');
      if (saved) {
        try {
          setProducts(JSON.parse(saved));
        } catch {
          setProducts(DEFAULT_PRODUCTS);
        }
      } else {
        setProducts(DEFAULT_PRODUCTS);
        localStorage.setItem('rfid_pos_products', JSON.stringify(DEFAULT_PRODUCTS));
      }
    }
  }, []);

  const saveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rfid_pos_products', JSON.stringify(updatedProducts));
    }
  };

  const canManageProducts = profile?.role === 'hotel_admin' || profile?.role === 'manager' || profile?.role === 'super_admin';
  
  // Cart state
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  
  // Local Database and Sync states
  const { isOnline, isSyncing, syncQueueCount, lastSyncedAt, syncError, forceSync, updateQueueCount } = useSync(tenantId);
  const [localRooms, setLocalRooms] = useState<Room[]>([]);
  const [localGuests, setLocalGuests] = useState<Guest[]>([]);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);
  
  // Modals and NFC simulations
  const [isNfcModalOpen, setIsNfcModalOpen] = useState(false);
  const [activeTransactionAmount, setActiveTransactionAmount] = useState<number>(0);
  const [nfcInput, setNfcInput] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'scanning' | 'entering_pin' | 'success' | 'error'>('idle');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [lastPaymentResult, setLastPaymentResult] = useState<{
    guestName: string;
    roomNumber: string;
    amount: number;
    newBalance: number;
    txId: string;
    items?: { product: Product; quantity: number }[];
  } | null>(null);

  const [scannedCardUid, setScannedCardUid] = useState<string>('');
  const [pinCodeInput, setPinCodeInput] = useState<string>('');
  const [tempGuestName, setTempGuestName] = useState<string>('');
  const [tempRoomNumber, setTempRoomNumber] = useState<string>('');

  const [posMode, setPosMode] = useState<'menu' | 'direct'>('menu');
  const [directAmountRaw, setDirectAmountRaw] = useState<string>('0');
  const [directTxType, setDirectTxType] = useState<'charge' | 'topup'>('charge');

  // Sound triggers (Web Audio API simulation)
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
        
        // Secondary harmonic for a happy chime
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
      console.warn('Web Audio API not allowed or supported yet.', e);
    }
  };

  // Keyboard RFID Scanner listener ref
  const nfcInputRef = useRef<HTMLInputElement>(null);

  // Keep focus on hidden card UID inputs when scanning modal is open
  useEffect(() => {
    if (isNfcModalOpen && nfcInputRef.current) {
      nfcInputRef.current.focus();
    }
  }, [isNfcModalOpen]);

  // Load local state from IndexedDB
  const refreshLocalState = async () => {
    try {
      const rooms = await OfflineDBService.getAll<Room>('rooms');
      const guests = await OfflineDBService.getAll<Guest>('guests');
      const txs = await OfflineDBService.getAll<Transaction>('transactions');
      
      // Sort transactions by date descending
      txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setLocalRooms(rooms);
      setLocalGuests(guests);
      setLocalTransactions(txs.slice(0, 10)); // keep last 10 for dashboard preview
    } catch (err) {
      console.error('Error refreshing local UI databases:', err);
    }
  };

  useEffect(() => {
    refreshLocalState();
  }, [syncQueueCount]);

  const isExpired = tenant?.subscription_expires_at ? new Date(tenant.subscription_expires_at) < new Date() : false;
  const showLockScreen = profile?.role !== 'super_admin' && (tenant?.status !== 'active' || isExpired);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)', color: 'var(--muted)' }}>
        Yükleniyor...
      </div>
    );
  }

  if (showLockScreen) {
    return <BillingLockScreen />;
  }

  // Mock-seeding data in case user doesn't have Supabase configured yet
  const handleSeedData = async () => {
    try {
      const sampleTenants = [
        { id: tenantId, name: tenant?.name || 'Grand Antigravity Resort & Spa', status: 'active' }
      ];
      const sampleRooms: Room[] = [
        { id: 'room-101', tenant_id: tenantId, room_number: '101', wallet_balance: 1500.00, pin_code: '1234', status: 'occupied' },
        { id: 'room-102', tenant_id: tenantId, room_number: '102', wallet_balance: 350.00, pin_code: '4321', status: 'occupied' },
        { id: 'room-103', tenant_id: tenantId, room_number: '103', wallet_balance: 0.00, pin_code: '0000', status: 'active' },
        { id: 'room-104', tenant_id: tenantId, room_number: '104', wallet_balance: 4200.00, pin_code: '2580', status: 'occupied' },
        { id: 'room-105', tenant_id: tenantId, room_number: '105', wallet_balance: 120.00, pin_code: '9876', status: 'maintenance' }
      ];
      const sampleGuests: Guest[] = [
        { id: 'guest-1', room_id: 'room-101', guest_name: 'Can Yılmaz', card_uid: 'A1B2C3D4', status: 'active' },
        { id: 'guest-2', room_id: 'room-102', guest_name: 'Merve Kaya', card_uid: 'E5F6G7H8', status: 'active' },
        { id: 'guest-3', room_id: 'room-104', guest_name: 'John Doe', card_uid: '90ABCDEF', status: 'active' }
      ];

      await OfflineDBService.bulkUpsert('tenants', sampleTenants);
      await OfflineDBService.bulkUpsert('rooms', sampleRooms);
      await OfflineDBService.bulkUpsert('guests', sampleGuests);
      
      alert('Local IndexedDB successfully initialized with active hotel, rooms, guests, and card UIDs!');
      refreshLocalState();
    } catch (err: any) {
      alert('Failed to initialize local data: ' + err.message);
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as { product: Product; quantity: number }[]);
  };

  const clearCart = () => setCart([]);
  
  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  // RFID Checkout handler
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setPaymentStatus('scanning');
    setPaymentMessage('Terminal: Kartınızı veya anahtarlığınızı arka okuyucuya yaklaştırın...');
    setLastPaymentResult(null);
    setNfcInput('');
    setActiveTransactionAmount(getCartTotal());
    setIsNfcModalOpen(true);
  };

  // Helper to complete the transaction once card and PIN are validated
  const executeTransaction = async (cardUid: string, amount: number, txType: 'charge' | 'topup', pinCode?: string) => {
    const currentCartCopy = [...cart];
    try {
      const result = await OfflineDBService.processOfflineTransaction({
        cardUid,
        amount,
        type: txType,
        location,
        tenantId,
        pinCode,
        performedBy: activeStaff?.id || profile?.id
      });

      const guest = await OfflineDBService.getById<Guest>('guests', result.transaction.guest_id || '');
      
      playBeep('success');
      setPaymentStatus('success');
      setPaymentMessage(txType === 'topup' ? 'Bakiye yükleme işlemi başarıyla tamamlandı!' : 'Ödeme başarıyla onaylandı!');
      setLastPaymentResult({
        guestName: guest?.guest_name || 'Misafir',
        roomNumber: result.updatedRoom.room_number,
        amount,
        newBalance: result.updatedRoom.wallet_balance,
        txId: result.transaction.id,
        items: txType === 'charge' && posMode === 'menu' ? currentCartCopy : undefined
      });

      // Clear POS cart if it was a menu charge
      if (posMode === 'menu' && txType === 'charge') {
        setCart([]);
      }
      
      // Clear raw amount if it was calculator topup/charge
      if (posMode === 'direct') {
        setDirectAmountRaw('0');
      }

      await updateQueueCount();
      refreshLocalState();
      
      // Auto close after 3.5 seconds
      setTimeout(() => {
        setIsNfcModalOpen(false);
        setPaymentStatus('idle');
      }, 3500);
    } catch (err: any) {
      console.error(err);
      playBeep('error');
      setPaymentStatus('error');
      setPaymentMessage(err.message || 'Bir hata oluştu.');
    }
  };

  // Triggered when an RFID code is read (via mock list click or keyboard event)
  const processCardScan = async (scannedUid: string) => {
    const cleanUid = scannedUid.trim();
    if (!cleanUid) return;

    playBeep('scan');
    setPaymentStatus('scanning');
    setPaymentMessage(`Kart Okundu: "${cleanUid}". Oda ve misafir aranıyor...`);

    const isDirectTopup = posMode === 'direct' && directTxType === 'topup';
    const txType = isDirectTopup ? 'topup' : 'charge';
    const amount = posMode === 'direct' ? (parseFloat(directAmountRaw) / 100) : getCartTotal();

    try {
      // Find guest and room locally first
      const guest = await OfflineDBService.getGuestByCardUid(cleanUid);
      if (!guest) {
        throw new Error(`RFID Kartı ("${cleanUid}") sisteme kayıtlı değil.`);
      }
      if (guest.status !== 'active') {
        throw new Error('Bu misafir kartı pasif durumdadır.');
      }
      
      const room = await OfflineDBService.getById<Room>('rooms', guest.room_id);
      if (!room) {
        throw new Error('Oda cüzdanı bulunamadı.');
      }
      if (room.status !== 'active' && room.status !== 'occupied') {
        throw new Error(`Oda aktif değil (Durum: ${room.status})`);
      }

      if (txType === 'charge') {
        // Check balance in cents to avoid JS floating point bugs (e.g. 662.50 < 662.50 evaluation)
        const balanceCents = Math.round(Number(room.wallet_balance) * 100);
        const amountCents = Math.round(Number(amount) * 100);
        if (balanceCents < amountCents) {
          throw new Error(`Yetersiz bakiye. Mevcut: ₺${Number(room.wallet_balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}, Gereken: ₺${Number(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
        }

        // Card is verified, transition to PIN pad screen
        setScannedCardUid(cleanUid);
        setTempGuestName(guest.guest_name);
        setTempRoomNumber(room.room_number);
        setPinCodeInput('');
        setPaymentStatus('entering_pin');
        setPaymentMessage('Güvenlik için lütfen 4 haneli PIN kodunu giriniz.');
      } else {
        // Direct topup deposit: skip PIN code and process instantly!
        setPaymentStatus('scanning');
        setPaymentMessage(`Oda ${room.room_number} cüzdanına ₺${Number(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} yükleniyor...`);
        // Briefly delay to show scanning loader
        setTimeout(() => {
          executeTransaction(cleanUid, amount, 'topup');
        }, 800);
      }

    } catch (err: any) {
      console.error(err);
      playBeep('error');
      setPaymentStatus('error');
      setPaymentMessage(err.message || 'Bir hata oluştu.');
    }
  };

  // Triggered when a key on the virtual PIN pad is pressed
  const handlePinKeyPress = (key: string) => {
    if (paymentStatus !== 'entering_pin') return;

    if (key === 'C') {
      setPinCodeInput('');
    } else if (key === 'DEL') {
      setPinCodeInput(prev => prev.slice(0, -1));
    } else {
      // It's a digit
      if (pinCodeInput.length < 4) {
        const newPin = pinCodeInput + key;
        setPinCodeInput(newPin);
        
        // Auto submit on 4th digit
        if (newPin.length === 4) {
          setPaymentStatus('scanning');
          setPaymentMessage('PIN doğrulanıyor ve ödeme işleniyor...');
          // Delay briefly to allow user to see the 4th dot fill up
          setTimeout(() => {
            const amount = posMode === 'direct' ? (parseFloat(directAmountRaw) / 100) : getCartTotal();
            executeTransaction(scannedCardUid, amount, 'charge', newPin);
          }, 300);
        }
      }
    }
  };

  // Keyboard emulation handler (scanners input card UID followed by Enter)
  const handleKeyboardNfcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nfcInput) {
      // If we are currently entering a PIN, the hardware scanner input shouldn't replace it
      if (paymentStatus === 'scanning') {
        processCardScan(nfcInput);
      }
      setNfcInput('');
    }
  };

  // --- PRODUCT MANAGEMENT HANDLERS ---
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return alert('Ürün adı boş olamaz.');
    const priceNum = parseFloat(productForm.price);
    if (isNaN(priceNum) || priceNum <= 0) return alert('Lütfen geçerli bir fiyat giriniz.');

    if (editingProduct) {
      const updated = products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, name: productForm.name.trim(), price: priceNum, category: productForm.category, icon: productForm.icon.trim() || '📦' }
          : p
      );
      saveProducts(updated);
      
      setCart(prevCart => 
        prevCart.map(item => 
          item.product.id === editingProduct.id 
            ? { ...item, product: { ...item.product, name: productForm.name.trim(), price: priceNum, category: productForm.category, icon: productForm.icon.trim() || '📦' } }
            : item
        )
      );

      setEditingProduct(null);
    } else {
      const newProd: Product = {
        id: 'p-' + Date.now().toString(36),
        name: productForm.name.trim(),
        price: priceNum,
        category: productForm.category,
        icon: productForm.icon.trim() || '📦'
      };
      saveProducts([...products, newProd]);
    }

    setProductForm({
      name: '',
      price: '',
      category: 'beverage',
      icon: '☕'
    });
  };

  const handleDeleteProduct = (id: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    const updated = products.filter(p => p.id !== id);
    saveProducts(updated);
    setCart(prev => prev.filter(item => item.product.id !== id));
    if (editingProduct?.id === id) {
      setEditingProduct(null);
      setProductForm({ name: '', price: '', category: 'beverage', icon: '☕' });
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      icon: product.icon
    });
  };

  // Category filtering
  const filteredProducts = products.filter(p => activeCategory === 'all' || p.category === activeCategory);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-8">
      
      {/* 1. TOP HEADER BANNER (Realtime status, Location, Sync Status) */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border px-3 py-2 md:px-4 md:py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 md:gap-3 shadow-lg">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg text-white font-bold tracking-wider flex items-center gap-1.5 md:gap-2">
            <Layers size={18} className="text-white" />
            <span className="hidden sm:inline font-semibold text-xs md:text-sm">RFID PAY WALLET</span>
            <span className="sm:hidden font-semibold text-xs">RFID</span>
          </div>
          
          <div className="h-6 w-[1px] bg-border hidden md:block"></div>
          
          {/* Active Terminal Location Selector */}
          <div className="flex items-center gap-1 bg-card px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-border text-xs md:text-sm">
            <MapPin size={14} className="text-muted" />
            <span className="text-muted font-medium hidden md:inline">Bölge:</span>
            <select 
              value={location} 
              onChange={(e) => setLocation(e.target.value as any)}
              className="bg-transparent border-none text-indigo-500 dark:text-indigo-400 outline-none font-bold pr-1 cursor-pointer text-xs md:text-sm"
            >
              <option value="restaurant" className="bg-card text-foreground">Restaurant POS</option>
              <option value="bar" className="bg-card text-foreground">Lobby Bar POS</option>
              <option value="spa" className="bg-card text-foreground">SPA & Wellness</option>
              <option value="reception" className="bg-card text-foreground">Resepsiyon Cüzdan</option>
            </select>
          </div>
        </div>

        {/* Sync & Connectivity Dashboard */}
        <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
          {/* Online/Offline Status */}
          <div className={`flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 rounded-full font-bold ${
            isOnline 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
          }`}>
            {isOnline ? (
              <>
                <Wifi size={14} className="animate-pulse" />
                <span className="hidden sm:inline text-xs">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="animate-bounce" />
                <span className="hidden sm:inline text-xs">OFFLINE</span>
              </>
            )}
          </div>

          {/* Sync status button */}
          <button 
            onClick={forceSync}
            disabled={isSyncing}
            className={`flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border transition-all ${
              syncQueueCount > 0 
                ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white' 
                : 'bg-cardHover hover:bg-card border-border text-foreground'
            } disabled:opacity-50`}
            title="Verileri el ile eşitle"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            <span className="hidden md:inline">Eşitle</span>
            {syncQueueCount > 0 && (
              <span className="bg-amber-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded text-[10px] animate-pulse">
                {syncQueueCount}
              </span>
            )}
          </button>
          
          <div className="hidden lg:flex flex-col text-[10px] text-muted">
            <span>Senkron: {lastSyncedAt || 'Bekleniyor...'}</span>
            {syncError && <span className="text-red-400 font-medium truncate max-w-[120px]">{syncError}</span>}
          </div>

          {/* Product Management Settings Button */}
          {canManageProducts && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductForm({ name: '', price: '', category: 'beverage', icon: '☕' });
                setIsProductModalOpen(true);
              }}
              className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-all font-bold cursor-pointer"
              title="Ürünleri Yönet"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Ürünleri Yönet</span>
            </button>
          )}

          {/* Staff Switcher Button */}
          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold cursor-pointer text-xs md:text-sm"
            title="Aktif personeli değiştir"
          >
            <UserCheck size={14} />
            <span className="hidden sm:inline">Personel:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{activeStaff?.full_name?.split(' ')[0] || 'Seçilmedi'}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-cardHover transition-all font-bold cursor-pointer"
            title={theme === 'light' ? 'Koyu moda geç' : 'Açık moda geç'}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span className="hidden sm:inline">{theme === 'light' ? 'Koyu' : 'Açık'}</span>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 hover:text-red-500 transition-all font-bold cursor-pointer"
            title="Oturumu kapat ve çıkış yap"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Çıkış Yap</span>
          </button>
        </div>
      </header>

      {/* Mode Switcher Sub-header */}
      <div className="bg-cardHover/40 border-b border-border/80 px-4 py-2 flex gap-2">
        <button
          onClick={() => setPosMode('menu')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            posMode === 'menu'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-card text-muted hover:text-foreground border border-border'
          }`}
        >
          🍔 Ürün Menü Satış
        </button>
        <button
          onClick={() => setPosMode('direct')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            posMode === 'direct'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-card text-muted hover:text-foreground border border-border'
          }`}
        >
          <CreditCard size={14} /> Serbest Tutar / Bakiye Yükleme
        </button>
      </div>

      {posMode === 'menu' ? (
        /* 2. CORE CORE POS LAYOUT - PRODUCT MENU SCREEN */
        <main className="max-w-[1600px] mx-auto w-full px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in pb-16 lg:pb-0">
          
          {/* Mobile Tab Switcher */}
          <div className="lg:hidden flex bg-card/65 backdrop-blur-md border border-border p-1 rounded-2xl w-full col-span-1 mb-2">
            <button
              onClick={() => setActiveMobileTab('menu')}
              className={`flex-1 py-3 text-center rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                activeMobileTab === 'menu'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              🍔 Ürün Menüsü
            </button>
            <button
              onClick={() => setActiveMobileTab('cart')}
              className={`flex-1 py-3 text-center rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 relative ${
                activeMobileTab === 'cart'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              🛒 Sipariş Sepeti
              {cart.length > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          {/* LEFT COLUMN: THE BASKET & BILL (5 Cols) */}
          <section className={`lg:col-span-5 flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-2xl h-[calc(100vh-180px)] min-h-[480px] ${
            activeMobileTab === 'cart' ? 'flex animate-fade-in' : 'hidden lg:flex'
          }`}>
            
            {/* Cart Header */}
            <div className="p-4 bg-cardHover border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-400" />
                Sipariş Sepeti
              </h2>
              {cart.length > 0 && (
                <button 
                  onClick={clearCart} 
                  className="text-muted hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Cart items list (flex grow) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted space-y-4">
                  <div className="w-16 h-16 rounded-full bg-background border border-border flex items-center justify-center">
                    <ShoppingCart size={28} className="text-muted" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-muted">Sepetiniz Boş</p>
                    <p className="text-xs text-muted mt-1">Yandaki menüden ürün ekleyin</p>
                  </div>
                </div>
              ) : (
                cart.map((item) => (
                  <div 
                    key={item.product.id}
                    className="flex items-center justify-between bg-background border border-border/80 p-3 rounded-xl hover:border-borderLight transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl bg-card w-10 h-10 rounded-lg flex items-center justify-center border border-border">{item.product.icon}</span>
                      <div>
                        <p className="font-medium text-sm sm:text-base text-foreground">{item.product.name}</p>
                        <p className="text-xs text-indigo-500 dark:text-indigo-400 font-bold">₺{item.product.price.toFixed(2)} / adet</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateCartQuantity(item.product.id, -1)}
                        className="w-8 h-8 rounded-lg bg-cardHover hover:bg-card border border-border flex items-center justify-center text-foreground active:scale-95 transition-transform"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold text-sm min-w-[20px] text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartQuantity(item.product.id, 1)}
                        className="w-8 h-8 rounded-lg bg-cardHover hover:bg-card border border-border flex items-center justify-center text-foreground active:scale-95 transition-transform"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart calculations & action checkout */}
            <div className="p-4 bg-cardHover/40 border-t border-border space-y-4">
              <div className="flex justify-between items-center text-muted text-sm">
                <span>Ara Toplam</span>
                <span>₺{getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-3">
                <span className="font-bold text-foreground">Ödenecek Tutar</span>
                <span className="text-2xl font-extrabold text-emerald-500 dark:text-emerald-400">₺{getCartTotal().toFixed(2)}</span>
              </div>

              {/* LARGE CHECKOUT BUTTON FOR HANDHELD TOUCH */}
              <button
                onClick={handleOpenPayment}
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-650 text-white font-extrabold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-98 shadow-lg shadow-indigo-600/10 disabled:opacity-40 disabled:pointer-events-none"
              >
                <CreditCard size={22} />
                ÖDEME AL (RFID OKUT)
              </button>
            </div>
          </section>

          {/* RIGHT COLUMN: TOUCH-OPTIMIZED PRODUCT GRID (7 Cols) */}
          <section className={`lg:col-span-7 flex-col space-y-4 ${
            activeMobileTab === 'menu' ? 'flex animate-fade-in' : 'hidden lg:flex'
          }`}>
            
            {/* Category touch tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 text-sm scrollbar-none">
              {[
                { id: 'all', label: 'Tüm Ürünler', icon: '✨' },
                { id: 'beverage', label: 'İçecekler', icon: '🍹' },
                { id: 'food', label: 'Yemekler', icon: '🍕' },
                { id: 'dessert', label: 'Tatlılar', icon: '🍰' },
                { id: 'service', label: 'Hizmetler', icon: '💆' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold whitespace-nowrap border transition-all active:scale-95 ${
                    activeCategory === cat.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-card border-border text-muted hover:border-borderLight hover:text-foreground'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Touch optimized grid items with giant click surfaces */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="flex flex-col items-center justify-between text-center bg-card border border-border rounded-2xl p-4 hover:border-borderLight hover:bg-cardHover active:scale-95 transition-all aspect-square min-h-[140px] group relative overflow-hidden"
                >
                  {/* Tiny quick add indicator */}
                  <div className="absolute top-2 right-2 bg-card w-6 h-6 rounded-full border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={12} className="text-indigo-500" />
                  </div>
                  
                  <span className="text-4xl sm:text-5xl mt-2 block transform group-hover:scale-110 transition-transform duration-200">{product.icon}</span>
                  
                  <div className="w-full mt-2">
                    <p className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug">{product.name}</p>
                    <p className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm sm:text-base mt-1">₺{product.price.toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Floating Bottom Bar for Mobile (Visible on mobile, only on 'menu' tab, when cart has items) */}
          {cart.length > 0 && activeMobileTab === 'menu' && (
            <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden bg-card/95 backdrop-blur-md border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xl animate-fade-in">
              <div>
                <span className="text-[10px] text-muted font-bold uppercase block">Toplam Tutar</span>
                <span className="text-lg font-extrabold text-emerald-500 dark:text-emerald-400">₺{getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMobileTab('cart')}
                  className="bg-cardHover border border-border text-foreground font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  Sepeti Gör ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                </button>
                <button
                  type="button"
                  onClick={handleOpenPayment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <CreditCard size={14} />
                  Ödeme Al
                </button>
              </div>
            </div>
          )}
        </main>
      ) : (
        /* BINKART CALCULATOR STYLE DIRECT POS SCREEN */
        <main className="max-w-[1400px] mx-auto w-full px-4 mt-6 flex flex-col items-center animate-fade-in">
          
          {/* Main card & calculator interface */}
          <div className="w-full max-w-md flex flex-col bg-card border border-border rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            
            {/* Contactless Wave Card Image */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-750/45 rounded-2xl p-6 flex flex-col justify-between aspect-[1.58/1] w-full shadow-lg relative overflow-hidden group select-none">
              <div className="flex justify-between items-start">
                <span className="text-slate-400 font-bold text-2xl animate-pulse ml-auto">
                  <Wifi size={24} className="rotate-90 text-indigo-400" />
                </span>
              </div>
              <div className="mt-8 flex justify-between items-end">
                <div className="w-12 h-9 bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center justify-center">
                  <span className="text-[10px] text-amber-400/40 font-mono">CHIP</span>
                </div>
                <span className="text-xs text-slate-500 font-mono tracking-widest">**** **** **** ****</span>
              </div>
            </div>

            {/* Amount Display */}
            <div className="mt-6 bg-background border border-border rounded-2xl p-4 flex justify-between items-center w-full">
              <span className="text-muted font-bold text-xs uppercase tracking-wider">TUTAR</span>
              <span className="text-3xl font-black text-foreground font-mono">
                {parseFloat(directAmountRaw) === 0 ? '0,00' : (parseFloat(directAmountRaw)/100).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ₺
              </span>
            </div>

            {/* Keyboard Layout */}
            <div className="mt-6 grid grid-cols-4 gap-2.5 w-full items-stretch">
              
              {/* Keypad Grid (3 columns spanning 3 rows) */}
              <div className="col-span-3 grid grid-cols-3 gap-2.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      playBeep('scan');
                      setDirectAmountRaw(prev => (prev === '0' ? num : prev + num).slice(0, 9));
                    }}
                    className="py-4 rounded-2xl bg-cardHover hover:bg-card border border-border text-foreground font-extrabold text-xl active:scale-90 transition-all flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                
                {/* Çıkış Button (C) */}
                <button
                  type="button"
                  onClick={() => {
                    playBeep('scan');
                    setDirectAmountRaw('0');
                  }}
                  className="py-4 rounded-2xl bg-cardHover hover:bg-card border border-border text-muted font-bold text-xs active:scale-90 transition-all flex items-center justify-center uppercase"
                >
                  ÇIKIŞ
                </button>
                
                {/* 0 Button */}
                <button
                  type="button"
                  onClick={() => {
                    playBeep('scan');
                    setDirectAmountRaw(prev => (prev === '0' ? '0' : prev + '0').slice(0, 9));
                  }}
                  className="py-4 rounded-2xl bg-cardHover hover:bg-card border border-border text-foreground font-extrabold text-xl active:scale-90 transition-all flex items-center justify-center"
                >
                  0
                </button>
                
                {/* ,00 Button */}
                <button
                  type="button"
                  onClick={() => {
                    playBeep('scan');
                    setDirectAmountRaw(prev => (prev === '0' ? '0' : prev + '00').slice(0, 9));
                  }}
                  className="py-4 rounded-2xl bg-cardHover hover:bg-card border border-border text-foreground font-extrabold text-lg active:scale-90 transition-all flex items-center justify-center"
                >
                  ,00
                </button>
              </div>

              {/* Right Column Action Keys */}
              <div className="col-span-1 flex flex-col gap-2.5">
                {/* Backspace Key */}
                <button
                  type="button"
                  onClick={() => {
                    playBeep('scan');
                    setDirectAmountRaw(prev => {
                      if (prev.length <= 1) return '0';
                      return prev.slice(0, -1);
                    });
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-xl active:scale-90 transition-all flex items-center justify-center"
                  title="Geri"
                >
                  ←
                </button>
                
                {/* QR Dolum / Bakiye Yükle Key */}
                <button
                  type="button"
                  onClick={() => {
                    const amt = parseFloat(directAmountRaw) / 100;
                    if (amt <= 0) return alert('Lütfen geçerli bir yükleme tutarı giriniz.');
                    setDirectTxType('topup');
                    setActiveTransactionAmount(amt);
                    setPaymentStatus('scanning');
                    setPaymentMessage('Bakiye yüklemek için kartı dokundurun...');
                    setLastPaymentResult(null);
                    setNfcInput('');
                    setIsNfcModalOpen(true);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-600 dark:text-sky-400 font-bold text-[10px] sm:text-xs leading-tight active:scale-90 transition-all flex flex-col items-center justify-center"
                >
                  <span>QR/KART</span>
                  <span className="uppercase text-[9px] opacity-80 mt-0.5">DOLUM</span>
                </button>
                
                {/* Void / İptal Key */}
                <button
                  type="button"
                  onClick={() => {
                    playBeep('error');
                    setDirectAmountRaw('0');
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs active:scale-90 transition-all flex items-center justify-center uppercase"
                >
                  İ.İPTAL
                </button>
                
                {/* Cash / Nakit (Ödeme Al) Key */}
                <button
                  type="button"
                  onClick={() => {
                    const amt = parseFloat(directAmountRaw) / 100;
                    if (amt <= 0) return alert('Lütfen geçerli bir ödeme tutarı giriniz.');
                    setDirectTxType('charge');
                    setActiveTransactionAmount(amt);
                    setPaymentStatus('scanning');
                    setPaymentMessage('Ödeme almak için kartı dokundurun...');
                    setLastPaymentResult(null);
                    setNfcInput('');
                    setIsNfcModalOpen(true);
                  }}
                  className="flex-1 py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-650 text-white font-black text-xs active:scale-90 transition-all flex items-center justify-center uppercase shadow-md shadow-emerald-600/10"
                >
                  ÖDEME AL
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 3. SIMULATOR PANEL (Bottom section to seed & check local IndexedDB) */}
      <footer className="hidden md:block max-w-[1600px] mx-auto w-full px-4 mt-8 pt-8 border-t border-border">
        <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
                    <p className="text-xs text-muted leading-relaxed mb-4">
              Bu panel, cihaz çevrimdışı (offline) olduğunda dahi sistemin yerel IndexedDB üzerinden RFID kartlarını doğrulama, oda bakiye kontrollerini gerçekleştirme ve işlem kuyruğunu yönetme kabiliyetini test etmeniz için tasarlanmıştır.
            </p>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleSeedData}
                className="bg-indigo-650/10 hover:bg-indigo-650/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
              >
                <Layers size={14} />
                Yerel Test Verisi Yükle (IndexedDB'yi Doldur)
              </button>
              
              <button 
                onClick={refreshLocalState}
                className="bg-cardHover hover:bg-card text-foreground border border-border px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
              >
                <RefreshCw size={14} />
                Listeleri Yenile
              </button>
            </div>
          </div>

          {/* Test Badges to trigger simulation quickly */}
          <div>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Simüle Edilebilir Test RFID Kartları:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {localGuests.length === 0 ? (
                <p className="text-muted italic text-[11px] p-2">Yerel misafir/kart verisi bulunamadı.</p>
              ) : (
                localGuests.map(g => {
                  const room = localRooms.find(r => r.id === g.room_id);
                  return (
                    <div key={g.id} className="bg-background p-2.5 rounded-xl border border-border flex justify-between items-center">
                      <div>
                        <p className="font-bold text-foreground">{g.guest_name} (Oda {room?.room_number || '?'})</p>
                        <p className="text-[10px] text-muted">UID: {g.card_uid}</p>
                      </div>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] border ${
                        g.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' 
                          : 'bg-cardHover text-muted border-border'
                      }`}>
                        {g.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Local database list representation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Rooms and Balances */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3 border-b border-border pb-2">
              <Home size={16} className="text-indigo-400" />
              Yerel Oda Bakiyeleri (Cache)
            </h4>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {localRooms.length === 0 ? (
                <p className="text-xs text-muted italic p-2">Yerel oda verisi yok. Yukardaki butondan seet edebilirsiniz.</p>
              ) : (
                localRooms.map(r => (
                  <div key={r.id} className="flex justify-between items-center bg-background border border-border/50 p-2 rounded-lg text-xs">
                    <span className="font-bold text-foreground">Oda {r.room_number}</span>
                    <span className={`font-mono font-extrabold ${r.wallet_balance > 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      ₺{Number(r.wallet_balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cards and Guests */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3 border-b border-border pb-2">
              <UserCheck size={16} className="text-indigo-400" />
              Tanımlı Kartlar / Misafirler
            </h4>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {localGuests.length === 0 ? (
                <p className="text-xs text-muted italic p-2">Yerel misafir verisi yok.</p>
              ) : (
                localGuests.map(g => (
                  <div key={g.id} className="flex justify-between items-center bg-background border border-border/50 p-2 rounded-lg text-xs">
                    <div>
                      <p className="font-bold text-foreground">{g.guest_name}</p>
                      <p className="text-[10px] text-muted">UID: {g.card_uid}</p>
                    </div>
                    <span className="text-[10px] bg-accent-glow border border-accent/20 text-indigo-650 dark:text-indigo-455 px-1.5 py-0.5 rounded font-mono">
                      Oda {(localRooms.find(r => r.id === g.room_id))?.room_number || '?'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Transactions Log */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3 border-b border-border pb-2">
              <Clock size={16} className="text-indigo-400" />
              Son Yerel İşlemler (Harcamalar)
            </h4>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {localTransactions.length === 0 ? (
                <p className="text-xs text-muted italic p-2">Henüz harcama kaydı bulunmuyor.</p>
              ) : (
                localTransactions.map(tx => {
                  const guest = localGuests.find(g => g.id === tx.guest_id);
                  const room = localRooms.find(r => r.id === tx.room_id);
                  return (
                    <div key={tx.id} className="bg-background border border-border/50 p-2.5 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-foreground">Oda {room?.room_number || '?'} ({guest?.guest_name || 'Misafir'})</span>
                        <span className="font-mono font-bold text-red-500 dark:text-red-400">-{tx.type === 'topup' ? '+' : ''}₺{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted">
                        <span className="capitalize">{tx.location} &bull; {new Date(tx.created_at).toLocaleTimeString()}</span>
                        <span className={`px-1 rounded border ${tx.is_synced ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-500/10' : 'bg-amber-500/10 text-amber-650 dark:text-amber-400 border-amber-500/10'}`}>
                          {tx.is_synced ? 'Bulut Eşitlendi' : 'Yerel Kuyrukta'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* 4. DIALOG MODAL: CARD READING SCREEN */}
      {isNfcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            
            {/* Ambient Background Glow matching payment status */}
            <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[100px] opacity-40 transition-colors ${
              paymentStatus === 'success' ? 'bg-emerald-500' : 
              paymentStatus === 'error' ? 'bg-red-500' : 'bg-indigo-600'
            }`}></div>

            <div className="flex justify-between items-center mb-6 relative">
              <h3 className="text-lg font-bold text-foreground">
                {paymentStatus === 'entering_pin' ? 'Oda PIN Doğrulama' : 'Kart Teması Bekleniyor'}
              </h3>
              <button 
                onClick={() => {
                  setIsNfcModalOpen(false);
                  setPaymentStatus('idle');
                }} 
                className="text-muted hover:text-foreground p-1 rounded-full hover:bg-cardHover"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Modal payment feedback content */}
            <div className="flex flex-col items-center text-center py-4 relative w-full">
              
              {paymentStatus === 'entering_pin' ? (
                // PIN PAD INTERFACE
                <div className="w-full flex flex-col items-center">
                  <div className="bg-accent-glow px-4 py-2 rounded-2xl border border-accent/20 mb-2 max-w-sm text-center">
                    <p className="text-indigo-650 dark:text-indigo-400 font-bold text-xs tracking-wider uppercase">Misafir Bilgileri</p>
                    <p className="text-foreground text-sm font-semibold mt-0.5">Oda {tempRoomNumber} &bull; {tempGuestName}</p>
                  </div>

                  <p className="text-xs text-muted font-medium px-4 mb-4">
                    {paymentMessage}
                  </p>

                  {/* 4 PIN Dots */}
                  <div className="flex gap-5 justify-center mb-6">
                    {[0, 1, 2, 3].map((index) => (
                      <div 
                        key={index} 
                        className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                          index < pinCodeInput.length 
                            ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-lg shadow-indigo-500/50' 
                            : 'border-border bg-background'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Keyboard Grid */}
                  <div className="grid grid-cols-3 gap-2 w-full max-w-[290px] mx-auto mb-4">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handlePinKeyPress(key)}
                        className={`py-3.5 rounded-2xl text-lg font-bold transition-all active:scale-90 flex items-center justify-center border ${
                          key === 'C' ? 'bg-red-500/10 hover:bg-red-500/20 text-red-650 dark:text-red-400 border-red-500/20' :
                          key === 'DEL' ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-605 dark:text-amber-400 border-amber-500/20' :
                          'bg-cardHover hover:bg-card text-foreground border-border'
                        }`}
                      >
                        {key === 'DEL' ? '⌫' : key}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('scanning');
                      setPaymentMessage('Terminal: Kartınızı veya anahtarlığınızı arka okuyucuya yaklaştırın...');
                      setPinCodeInput('');
                    }}
                    className="text-xs font-bold text-muted hover:text-foreground transition-colors uppercase tracking-wider mt-2 py-1 px-3 hover:bg-cardHover rounded-lg"
                  >
                    Geri Dön (Kartı Yeniden Okut)
                  </button>
                </div>
              ) : (
                // STANDARD SCANNING/SUCCESS/ERROR INTERFACE
                <div className="w-full flex flex-col items-center">
                  {/* Animating Visual state */}
                  {paymentStatus === 'scanning' && (
                    <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 animate-pulse"></div>
                      <div className="absolute inset-2 rounded-full border-4 border-t-indigo-500 border-r-indigo-500/30 border-b-indigo-500/10 border-l-indigo-500/50 animate-spin"></div>
                      <CreditCard size={40} className="text-indigo-500 dark:text-indigo-400 animate-pulse" />
                    </div>
                  )}

                  {paymentStatus === 'success' && (
                    <div className="w-28 h-28 mb-6 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
                      <CheckCircle size={48} className="animate-bounce" />
                    </div>
                  )}

                  {paymentStatus === 'error' && (
                    <div className="w-28 h-28 mb-6 bg-red-500/10 border-2 border-red-500/20 rounded-full flex items-center justify-center text-red-650 dark:text-red-400 shadow-lg shadow-red-500/10">
                      <XCircle size={48} />
                    </div>
                  )}

                  {/* Status Message */}
                  <p className="font-bold text-lg text-foreground mb-2">
                    {directTxType === 'topup' ? 'Yükleme Tutarı' : 'Harcama Tutarı'}: <span className="text-emerald-650 dark:text-emerald-400 font-extrabold">₺{activeTransactionAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                  </p>
                  
                  <p className={`text-sm px-4 ${
                    paymentStatus === 'success' ? 'text-emerald-600 dark:text-emerald-450 font-semibold' :
                    paymentStatus === 'error' ? 'text-red-600 dark:text-red-450 font-semibold' : 'text-muted'
                  }`}>
                    {paymentMessage}
                  </p>

                  {/* Display success card details */}
                  {paymentStatus === 'success' && lastPaymentResult && (
                    <div className="mt-6 p-4 bg-background border border-border rounded-2xl w-full text-xs text-left space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted">Misafir Adı:</span>
                        <span className="font-bold text-foreground">{lastPaymentResult.guestName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Oda No:</span>
                        <span className="font-bold text-foreground">Oda {lastPaymentResult.roomNumber}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="text-muted">{directTxType === 'topup' ? 'Yüklenen:' : 'Harcama:'}</span>
                        <span className={`font-bold ${directTxType === 'topup' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {directTxType === 'topup' ? '+' : '-'}₺{lastPaymentResult.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Kalan Bakiye:</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">₺{lastPaymentResult.newBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      
                      <button
                        onClick={() => {
                          if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.printPage === 'function') {
                            (window as any).AndroidBridge.printPage();
                          } else {
                            window.print();
                          }
                        }}
                        className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Printer size={14} />
                        FİŞ YAZDIR (TERMAL)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hidden Input for Keyboard RFID Emulator scanners */}
            {paymentStatus === 'scanning' && (
              <form onSubmit={handleKeyboardNfcSubmit} className="mt-4">
                <input
                  ref={nfcInputRef}
                  type="text"
                  value={nfcInput}
                  onChange={(e) => setNfcInput(e.target.value)}
                  placeholder="RFID UID Kodunu buraya okutun..."
                  className="w-full bg-background border border-border focus:border-indigo-500 text-foreground text-xs px-3 py-2.5 rounded-xl outline-none text-center font-mono opacity-20 hover:opacity-100 focus:opacity-100 transition-opacity"
                />
              </form>
            )}

            {/* Test Simulation trigger options inside modal */}
            {paymentStatus === 'scanning' && (
              <div className="hidden md:block mt-6 border-t border-border/80 pt-4 text-center">
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2">Simülatör RFID Kart Dokunuşu:</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {localGuests.length === 0 ? (
                    <p className="text-muted italic text-[9px] py-1">Sisteme tanımlı kart bulunamadı.</p>
                  ) : (
                    localGuests.map(g => {
                      const room = localRooms.find(r => r.id === g.room_id);
                      return (
                        <button
                          key={g.id}
                          onClick={() => processCardScan(g.card_uid)}
                          className="bg-cardHover hover:bg-card text-foreground px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-border"
                        >
                          {g.guest_name} (Oda {room?.room_number || '?'})
                        </button>
                      );
                    })
                  )}
                  <button
                    onClick={() => processCardScan('INVALID_RFID_CARD')}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-red-500/20"
                  >
                    Geçersiz Kart Simüle Et
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. DIALOG MODAL: PRODUCT MANAGEMENT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl bg-card border border-border rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-border">
              <h3 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <Settings size={22} className="text-indigo-500" />
                Ürün Yönetim Paneli
              </h3>
              <button 
                onClick={() => {
                  setIsProductModalOpen(false);
                  setEditingProduct(null);
                }} 
                className="text-muted hover:text-foreground p-1.5 rounded-full hover:bg-cardHover transition-all"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto pr-1">
              
              {/* Left Column: Add / Edit Form (5 Cols) */}
              <form onSubmit={handleSaveProduct} className="md:col-span-5 space-y-4 bg-background/50 border border-border/80 p-5 rounded-2xl">
                <h4 className="text-sm font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2">
                  {editingProduct ? '📝 Ürünü Düzenle' : '✨ Yeni Ürün Ekle'}
                </h4>

                {/* Product Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted">Ürün Adı</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Örn: Türk Kahvesi, Limonata"
                    className="w-full bg-background border border-border focus:border-indigo-500 text-foreground text-sm px-3.5 py-2.5 rounded-xl outline-none"
                  />
                </div>

                {/* Product Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted">Fiyat (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="Örn: 45.00"
                    className="w-full bg-background border border-border focus:border-indigo-500 text-foreground text-sm px-3.5 py-2.5 rounded-xl outline-none font-mono"
                  />
                </div>

                {/* Product Category */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted">Kategori</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value as any })}
                    className="w-full bg-background border border-border focus:border-indigo-500 text-foreground text-sm px-3.5 py-2.5 rounded-xl outline-none"
                  >
                    <option value="beverage">🍹 İçecek</option>
                    <option value="food">🍕 Yemek</option>
                    <option value="dessert">🍰 Tatlı</option>
                    <option value="service">💆 Hizmet</option>
                  </select>
                </div>

                {/* Product Icon / Emoji */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted">İkon (Emoji)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={productForm.icon}
                      onChange={(e) => setProductForm({ ...productForm, icon: e.target.value })}
                      placeholder="☕"
                      className="w-16 text-center bg-background border border-border focus:border-indigo-500 text-xl px-2 py-2.5 rounded-xl outline-none"
                    />
                    
                    {/* Quick select emoji buttons */}
                    <div className="flex-1 flex flex-wrap gap-1.5 p-1 bg-background border border-border/80 rounded-xl max-h-[85px] overflow-y-auto">
                      {['☕', '🍹', '🥤', '🍺', '🍸', '🍕', '🥪', '🍖', '🥗', '🧁', '🍰', '🍉', '💆', '🧺', '📦', '🍊', '🍋', '🍟', '🍦', '🍩'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setProductForm({ ...productForm, icon: emoji })}
                          className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                            productForm.icon === emoji ? 'bg-indigo-500 text-white' : 'bg-cardHover hover:bg-card border border-border/40'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-md"
                  >
                    {editingProduct ? 'Güncelle' : 'Ürünü Ekle'}
                  </button>
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({ name: '', price: '', category: 'beverage', icon: '☕' });
                      }}
                      className="bg-cardHover hover:bg-card border border-border text-muted font-bold py-3 px-4 rounded-xl text-xs sm:text-sm active:scale-95 transition-all"
                    >
                      İptal
                    </button>
                  )}
                </div>
              </form>

              {/* Right Column: Products List (7 Cols) */}
              <div className="md:col-span-7 flex flex-col">
                <h4 className="text-sm font-bold text-muted uppercase tracking-wider mb-3">Mevcut Ürünler ({products.length})</h4>
                
                <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px] pr-1">
                  {products.length === 0 ? (
                    <p className="text-xs text-muted italic text-center py-8">Henüz ürün bulunmuyor. Sol taraftan ekleyin.</p>
                  ) : (
                    products.map((product) => (
                      <div 
                        key={product.id}
                        className="flex items-center justify-between bg-background border border-border/80 p-3 rounded-xl hover:border-borderLight transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl bg-card w-10 h-10 rounded-lg flex items-center justify-center border border-border">{product.icon}</span>
                          <div>
                            <p className="font-bold text-sm text-foreground">{product.name}</p>
                            <p className="text-xs text-muted">
                              {product.category === 'beverage' ? '🍹 İçecek' :
                               product.category === 'food' ? '🍕 Yemek' :
                               product.category === 'dessert' ? '🍰 Tatlı' : '💆 Hizmet'}
                              {' '}&bull;{' '}
                              <span className="text-indigo-650 dark:text-indigo-400 font-extrabold">₺{product.price.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditClick(product)}
                            className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 active:scale-90 transition-all"
                            title="Düzenle"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-655 dark:text-red-400 border border-red-500/15 active:scale-90 transition-all"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden POS Receipt Print Section */}
      {lastPaymentResult && (
        <div id="pos-receipt-print" style={{ display: 'none' }}>
          <div style={{ textAlign: 'center', fontFamily: 'monospace', padding: 20, color: 'black' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: 16 }}>{tenant?.name || 'Grand Resort Hotel'}</h2>
            <p style={{ margin: '0 0 10px 0', fontSize: 10 }}>{location.toUpperCase()} POS FİŞİ</p>
            <p style={{ margin: '0 0 15px 0', fontSize: 10 }}>--------------------------------</p>
            
            <div style={{ textAlign: 'left', fontSize: 11, lineHeight: '1.4', marginBottom: 10 }}>
              <div><b>Fiş No:</b> {lastPaymentResult.txId.substring(0, 8).toUpperCase()}</div>
              <div><b>Tarih:</b> {new Date().toLocaleString('tr-TR')}</div>
              <div><b>Personel:</b> {activeStaff?.full_name || profile?.full_name}</div>
              <div><b>Oda:</b> Oda {lastPaymentResult.roomNumber}</div>
              <div><b>Misafir:</b> {lastPaymentResult.guestName}</div>
            </div>
            
            <p style={{ margin: '5px 0', fontSize: 10 }}>--------------------------------</p>
            
            {lastPaymentResult.items && lastPaymentResult.items.length > 0 ? (
              <div style={{ textAlign: 'left', fontSize: 11, marginBottom: 10 }}>
                {lastPaymentResult.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                    <span>{item.quantity}x {item.product.name}</span>
                    <span style={{ float: 'right' }}>₺{(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'left', fontSize: 11, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{directTxType === 'topup' ? 'Bakiye Yükleme' : 'Serbest Ödeme'}</span>
                  <span style={{ float: 'right' }}>₺{lastPaymentResult.amount.toFixed(2)}</span>
                </div>
              </div>
            )}
            
            <p style={{ margin: '5px 0', fontSize: 10 }}>--------------------------------</p>
            
            <div style={{ fontSize: 12, fontWeight: 'bold', margin: '5px 0', textAlign: 'left' }}>
              TOPLAM: <span style={{ float: 'right' }}>₺{lastPaymentResult.amount.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 11, margin: '5px 0', textAlign: 'left' }}>
              YENİ BAKİYE: <span style={{ float: 'right' }}>₺{lastPaymentResult.newBalance.toFixed(2)}</span>
            </div>
            
            <p style={{ margin: '15px 0 5px 0', fontSize: 10 }}>--------------------------------</p>
            <p style={{ margin: 0, fontSize: 9 }}>Bizi tercih ettiğiniz için teşekkür ederiz.</p>
          </div>
        </div>
      )}

      {/* Staff Switcher Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserCheck size={18} className="text-emerald-500" />
                Personel Değiştir
              </h3>
              <button 
                onClick={() => setIsStaffModalOpen(false)} 
                className="text-muted hover:text-foreground p-1 rounded-full hover:bg-cardHover"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {staffList.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted mb-4">Otelinize kayıtlı personel bulunamadı. Aşağıdaki hızlı profilleri kullanabilirsiniz:</p>
                  {[
                    { id: profile?.id || 'p-1', full_name: profile?.full_name || 'Admin', role: profile?.role || 'hotel_admin' },
                    { id: 'mock-waiter-1', full_name: 'Ahmet Yılmaz (Garson)', role: 'waiter' },
                    { id: 'mock-waiter-2', full_name: 'Ayşe Kaya (Garson)', role: 'waiter' },
                    { id: 'mock-cashier-1', full_name: 'Mehmet Demir (Kasiyer)', role: 'cashier' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveStaff(s);
                        setIsStaffModalOpen(false);
                        playBeep('success');
                      }}
                      className={`w-full flex justify-between items-center bg-cardHover hover:bg-card border p-3 rounded-xl transition-all ${
                        activeStaff?.id === s.id ? 'border-emerald-500 text-emerald-500 font-bold' : 'border-border text-foreground'
                      }`}
                    >
                      <span>{s.full_name}</span>
                      <span className="text-[10px] uppercase font-bold bg-background px-2 py-0.5 rounded text-muted">{s.role}</span>
                    </button>
                  ))}
                </div>
              ) : (
                staffList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveStaff(s);
                      setIsStaffModalOpen(false);
                      playBeep('success');
                    }}
                    className={`w-full flex justify-between items-center bg-cardHover hover:bg-card border p-3 rounded-xl transition-all ${
                      activeStaff?.id === s.id ? 'border-emerald-500 text-emerald-500 font-bold' : 'border-border text-foreground'
                    }`}
                  >
                    <span>{s.full_name}</span>
                    <span className="text-[10px] uppercase font-bold bg-background px-2 py-0.5 rounded text-muted">
                      {s.role === 'hotel_admin' ? 'Yönetici' :
                       s.role === 'manager' ? 'Müdür' :
                       s.role === 'waiter' ? 'Garson' :
                       s.role === 'cashier' ? 'Kasiyer' : s.role}
                    </span>
                  </button>
                ))
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setIsStaffModalOpen(false)}
                className="btn btn-ghost text-xs"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS Style block for receipt print style */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
            background: white !important;
            color: black !important;
          }
          #pos-receipt-print, #pos-receipt-print * {
            visibility: visible;
          }
          #pos-receipt-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
