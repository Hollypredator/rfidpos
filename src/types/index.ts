// ══════════════════════════════════════════════
// SaaS Multi-Tenant TypeScript Types
// ══════════════════════════════════════════════

export type UserRole = 'super_admin' | 'hotel_admin' | 'manager' | 'receptionist' | 'waiter' | 'cashier';

export type TenantStatus = 'active' | 'inactive' | 'suspended';
export type RoomStatus = 'active' | 'occupied' | 'maintenance' | 'checked_out';
export type GuestStatus = 'active' | 'inactive';
export type TransactionType = 'charge' | 'refund' | 'topup';
export type DeviceType = 'handheld' | 'desktop' | 'tablet' | 'kiosk';

// ── Tenant (Otel) ──────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency: string;
  timezone: string;
  settings: Record<string, unknown>;
  owner_id?: string;
  status: TenantStatus;
  subscription_plan?: string;
  subscription_expires_at?: string;
  created_at?: string;
}

// ── User Profile ────────────────────────────────
export interface Profile {
  id: string;
  tenant_id: string | null;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string;
  created_at?: string;
}

// ── Location (Hizmet noktası) ───────────────────
export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  icon: string;
  is_active: boolean;
  created_at?: string;
}

// ── Room (Oda — Cüzdan Master) ──────────────────
export interface Room {
  id: string;
  tenant_id: string;
  room_number: string;
  wallet_balance: number;
  pin_code: string;
  status: RoomStatus;
  created_at?: string;
}

// ── Guest (Misafir — RFID kart sahibi) ──────────
export interface Guest {
  id: string;
  room_id: string;
  guest_name: string;
  card_uid: string;
  status: GuestStatus;
  created_at?: string;
  // Joined fields
  room?: Room;
}

// ── Transaction (İşlem kaydı) ────────────────────
export interface Transaction {
  id: string;
  tenant_id: string;
  room_id: string;
  guest_id: string | null;
  location_id?: string | null;
  amount: number;
  type: TransactionType;
  location: string;
  description?: string;
  performed_by?: string;
  is_synced: boolean;
  created_at: string;
  // Joined fields
  room?: Room;
  guest?: Guest;
}

// ── Device (POS cihazı) ─────────────────────────
export interface Device {
  id: string;
  tenant_id: string;
  device_name: string;
  device_type: DeviceType;
  hardware_id?: string;
  assigned_location?: string;
  last_seen_at?: string;
  is_active: boolean;
  created_at?: string;
}

// ── Audit Log ────────────────────────────────────
export interface AuditLog {
  id: string;
  tenant_id?: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  metadata: Record<string, unknown>;
  ip_address?: string;
  created_at?: string;
  // Joined
  profile?: Profile;
}

// ── Sync Queue (Offline işlem kuyruğu) ───────────
export interface SyncQueueItem {
  id: string;
  transaction: Transaction;
  attempts: number;
  last_attempt?: string;
  error?: string;
}

// ── Auth Context types ───────────────────────────
export interface AuthState {
  user: import('@supabase/supabase-js').User | null;
  profile: Profile | null;
  tenant: Tenant | null;
  isLoading: boolean;
  error: string | null;
}

// ── Dashboard Stats ──────────────────────────────
export interface DashboardStats {
  totalRooms: number;
  occupiedRooms: number;
  totalBalance: number;
  todayTransactions: number;
  todayRevenue: number;
  activeGuests: number;
}

export interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  totalRooms: number;
  totalTransactions: number;
  totalDevices: number;
  totalVolume?: number;
}
