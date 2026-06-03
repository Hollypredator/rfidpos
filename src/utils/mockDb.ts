import { Room, Guest, Transaction, Location, Device, Profile, Tenant, AuditLog } from '../types';

export interface MockPayment {
  id: string;
  tenant_id: string;
  tenant_name: string;
  amount: number;
  bank_name: string;
  sender_name: string;
  reference_code: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface MockOrder {
  id: string;
  tenant_id: string;
  tenant_name: string;
  details: string;
  shipping_status: 'preparing' | 'shipped' | 'delivered';
  carrier?: string;
  tracking_number?: string;
  created_at: string;
}

export interface MockSupportTicket {
  id: string;
  tenant_id: string;
  tenant_name: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved';
  created_at: string;
}

export interface MockSchema {
  tenants: Tenant[];
  profiles: Profile[];
  locations: Location[];
  rooms: Room[];
  guests: Guest[];
  transactions: Transaction[];
  devices: Device[];
  payments: MockPayment[];
  orders: MockOrder[];
  tickets: MockSupportTicket[];
  audit_logs: AuditLog[];
}

const DEFAULT_TENANT_ID = 'mock-tenant-id';

const DEFAULT_DATA: MockSchema = {
  tenants: [
    {
      id: DEFAULT_TENANT_ID,
      name: 'Grand Antigravity Resort & Spa',
      slug: 'grand-antigravity',
      currency: 'TRY',
      timezone: 'Europe/Istanbul',
      status: 'active',
      subscription_plan: 'premium',
      subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      settings: {},
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-tenant-2',
      name: 'Bosphorus Boutique Hotel',
      slug: 'bosphorus-boutique',
      currency: 'EUR',
      timezone: 'Europe/Istanbul',
      status: 'suspended',
      subscription_plan: 'none',
      subscription_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      settings: {},
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ],
  profiles: [
    {
      id: 'mock-user-id',
      tenant_id: DEFAULT_TENANT_ID,
      full_name: 'Deneme Otel Yöneticisi',
      email: 'admin@hotelpos.com',
      role: 'hotel_admin',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-super_admin-id',
      tenant_id: null,
      full_name: 'Sistem Süper Yöneticisi',
      email: 'super@hotelpos.com',
      role: 'super_admin',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-waiter-id',
      tenant_id: DEFAULT_TENANT_ID,
      full_name: 'Ahmet Garson',
      email: 'waiter@hotelpos.com',
      role: 'waiter',
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-receptionist-id',
      tenant_id: DEFAULT_TENANT_ID,
      full_name: 'Ayşe Resepsiyon',
      email: 'receptionist@hotelpos.com',
      role: 'receptionist',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ],
  locations: [
    { id: 'loc-reception', tenant_id: DEFAULT_TENANT_ID, name: 'Resepsiyon', slug: 'reception', icon: 'Building', is_active: true, created_at: new Date().toISOString() },
    { id: 'loc-restaurant', tenant_id: DEFAULT_TENANT_ID, name: 'Restoran', slug: 'restaurant', icon: 'UtensilsCrossed', is_active: true, created_at: new Date().toISOString() },
    { id: 'loc-bar', tenant_id: DEFAULT_TENANT_ID, name: 'Bar', slug: 'bar', icon: 'Wine', is_active: true, created_at: new Date().toISOString() },
    { id: 'loc-spa', tenant_id: DEFAULT_TENANT_ID, name: 'Spa', slug: 'spa', icon: 'Sparkles', is_active: true, created_at: new Date().toISOString() },
  ],
  rooms: [
    { id: 'room-101', tenant_id: DEFAULT_TENANT_ID, room_number: '101', wallet_balance: 1500, pin_code: '1234', status: 'occupied', created_at: new Date().toISOString() },
    { id: 'room-102', tenant_id: DEFAULT_TENANT_ID, room_number: '102', wallet_balance: 350, pin_code: '4321', status: 'occupied', created_at: new Date().toISOString() },
    { id: 'room-103', tenant_id: DEFAULT_TENANT_ID, room_number: '103', wallet_balance: 0, pin_code: '0000', status: 'active', created_at: new Date().toISOString() },
    { id: 'room-104', tenant_id: DEFAULT_TENANT_ID, room_number: '104', wallet_balance: 4200, pin_code: '2580', status: 'occupied', created_at: new Date().toISOString() },
    { id: 'room-105', tenant_id: DEFAULT_TENANT_ID, room_number: '105', wallet_balance: 120, pin_code: '9876', status: 'maintenance', created_at: new Date().toISOString() },
  ],
  guests: [
    { id: 'guest-1', room_id: 'room-101', guest_name: 'Can Yılmaz', card_uid: 'A1B2C3D4', status: 'active', created_at: new Date().toISOString() },
    { id: 'guest-2', room_id: 'room-102', guest_name: 'Merve Kaya', card_uid: 'E5F6G7H8', status: 'active', created_at: new Date().toISOString() },
    { id: 'guest-3', room_id: 'room-104', guest_name: 'John Doe', card_uid: '90ABCDEF', status: 'active', created_at: new Date().toISOString() },
  ],
  transactions: [
    {
      id: 'tx-1',
      tenant_id: DEFAULT_TENANT_ID,
      room_id: 'room-101',
      guest_id: 'guest-1',
      amount: 150,
      type: 'charge',
      location: 'Restoran',
      description: 'Öğle yemeği ve içecekler',
      performed_by: 'mock-waiter-id',
      is_synced: true,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      id: 'tx-2',
      tenant_id: DEFAULT_TENANT_ID,
      room_id: 'room-101',
      guest_id: 'guest-1',
      amount: 2000,
      type: 'topup',
      location: 'Resepsiyon',
      description: 'Kredi kartı ile bakiye yükleme',
      performed_by: 'mock-receptionist-id',
      is_synced: true,
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
    },
    {
      id: 'tx-3',
      tenant_id: DEFAULT_TENANT_ID,
      room_id: 'room-102',
      guest_id: 'guest-2',
      amount: 85,
      type: 'charge',
      location: 'Bar',
      description: 'Kokteyl',
      performed_by: 'mock-waiter-id',
      is_synced: true,
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
    },
    {
      id: 'tx-4',
      tenant_id: DEFAULT_TENANT_ID,
      room_id: 'room-104',
      guest_id: 'guest-3',
      amount: 500,
      type: 'charge',
      location: 'Spa',
      description: 'Masaj hizmeti',
      performed_by: 'mock-receptionist-id',
      is_synced: true,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 mins ago
    },
    {
      id: 'tx-5',
      tenant_id: DEFAULT_TENANT_ID,
      room_id: 'room-102',
      guest_id: 'guest-2',
      amount: 500,
      type: 'topup',
      location: 'Resepsiyon',
      description: 'Nakit bakiye yükleme',
      performed_by: 'mock-receptionist-id',
      is_synced: true,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
    }
  ],
  devices: [
    { id: 'dev-1', tenant_id: DEFAULT_TENANT_ID, device_name: 'Restoran El Terminali 1', device_type: 'handheld', assigned_location: 'Restoran', is_active: true, created_at: new Date().toISOString() },
    { id: 'dev-2', tenant_id: DEFAULT_TENANT_ID, device_name: 'Resepsiyon Ana Masaüstü', device_type: 'desktop', assigned_location: 'Resepsiyon', is_active: true, created_at: new Date().toISOString() },
    { id: 'dev-3', tenant_id: DEFAULT_TENANT_ID, device_name: 'Lobi Bar Tableti', device_type: 'tablet', assigned_location: 'Bar', is_active: true, created_at: new Date().toISOString() },
  ],
  payments: [
    {
      id: 'pay-1',
      tenant_id: 'mock-tenant-2',
      tenant_name: 'Bosphorus Boutique Hotel',
      amount: 15000,
      bank_name: 'Garanti BBVA',
      sender_name: 'Bosphorus Turizm Tic. A.Ş.',
      reference_code: 'mock-tenant-2',
      status: 'pending',
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'pay-2',
      tenant_id: DEFAULT_TENANT_ID,
      tenant_name: 'Grand Antigravity Resort & Spa',
      amount: 45000,
      bank_name: 'Akbank',
      sender_name: 'Antigravity Turizm A.Ş.',
      reference_code: DEFAULT_TENANT_ID,
      status: 'approved',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  orders: [
    {
      id: 'order-1',
      tenant_id: 'mock-tenant-2',
      tenant_name: 'Bosphorus Boutique Hotel',
      details: '2x El Terminali (Android), 100x RFID Bileklik',
      shipping_status: 'preparing',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'order-2',
      tenant_id: DEFAULT_TENANT_ID,
      tenant_name: 'Grand Antigravity Resort & Spa',
      details: '5x El Terminali, 1x Masaüstü RFID Okuyucu, 500x RFID Anahtarlık',
      shipping_status: 'delivered',
      carrier: 'Yurtiçi Kargo',
      tracking_number: 'YK-1234567890',
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  tickets: [
    {
      id: 'ticket-1',
      tenant_id: 'mock-tenant-2',
      tenant_name: 'Bosphorus Boutique Hotel',
      subject: 'Aktivasyon ve Donanım Talebi',
      message: 'Merhaba, 2 adet el terminali ve 100 adet RFID bileklik siparişi verdik, banka transferini tamamladık. Cihaz kargosu ve abonelik aktivasyonu için desteklerinizi bekliyoruz.',
      priority: 'high',
      status: 'pending',
      created_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'ticket-2',
      tenant_id: DEFAULT_TENANT_ID,
      tenant_name: 'Grand Antigravity Resort & Spa',
      subject: 'İlave RFID Kart Tanımlama',
      message: 'Sisteme yeni kartlar eklemek istiyoruz, süreç hakkında bilgi alabilir miyiz?',
      priority: 'medium',
      status: 'resolved',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  audit_logs: [
    {
      id: 'mock-audit-1',
      tenant_id: DEFAULT_TENANT_ID,
      user_id: 'mock-super_admin-id',
      action: 'support_ticket_replied',
      entity_type: 'ticket',
      entity_id: 'ticket-2',
      metadata: {
        reply_message: 'Merhaba, RFID kart tanımlamalarını Odalar -> Misafirler sekmesinden "Yeni Misafir" butonuna basarak kartı tanımlayabilirsiniz. Ek olarak POS cihazı üzerinden kart okutarak hızlı yükleme yapabilirsiniz.',
        status: 'resolved'
      },
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
};

const DB_KEY = 'rfid_pos_mock_db';

export function getMockDb(): MockSchema {
  if (typeof window === 'undefined') return DEFAULT_DATA;
  const stored = localStorage.getItem(DB_KEY);
  if (!stored) {
    localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DATA));
    return DEFAULT_DATA;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveMockDb(db: MockSchema): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }
}

export function getTableData<K extends keyof MockSchema>(table: K): MockSchema[K] {
  return getMockDb()[table];
}

export function setTableData<K extends keyof MockSchema>(table: K, data: MockSchema[K]): void {
  const db = getMockDb();
  db[table] = data as any;
  saveMockDb(db);
}
