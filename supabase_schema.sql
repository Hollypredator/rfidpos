-- ══════════════════════════════════════════════
-- RFID POS SaaS — Supabase PostgreSQL DDL
-- Multi-Tenant with Row Level Security
-- ══════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════
-- 1. TENANTS (Oteller)
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Istanbul',
    settings JSONB NOT NULL DEFAULT '{}',
    owner_id UUID,  -- will reference auth.users after profiles table
    status VARCHAR(50) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended')),
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'none',
    subscription_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() - INTERVAL '1 second'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 2. PROFILES (Kullanıcı profilleri — Supabase Auth bağlantılı)
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'waiter'
        CHECK (role IN ('super_admin', 'hotel_admin', 'manager', 'receptionist', 'waiter', 'cashier')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Set owner FK after profiles exist
ALTER TABLE tenants
    DROP CONSTRAINT IF EXISTS tenants_owner_id_fkey;
ALTER TABLE tenants
    ADD CONSTRAINT tenants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);

-- ══════════════════════════════════════════════
-- 3. LOCATIONS (Dinamik hizmet noktaları)
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    icon VARCHAR(50) DEFAULT 'MapPin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_location UNIQUE(tenant_id, slug)
);

-- ══════════════════════════════════════════════
-- 4. ROOMS (Odalar — Wallet Master)
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL,
    wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0.00),
    pin_code VARCHAR(4) NOT NULL CHECK (pin_code ~ '^[0-9]{4}$'),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'occupied', 'maintenance', 'checked_out')),
    daily_limit NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_room UNIQUE(tenant_id, room_number)
);

-- ══════════════════════════════════════════════
-- 5. GUESTS (Misafirler — RFID kart sahipleri)
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    guest_name VARCHAR(255) NOT NULL,
    card_uid VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 6. TRANSACTIONS (İşlem logları)
-- NOT: location_id (FK) gelecekte location string'ini değiştirecek.
--      Şu an uygulama kodu yalnızca 'location' string'ini kullanıyor.
--      Migration planlandığında location_id'ye geçiş yapılacak.
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type VARCHAR(20) NOT NULL CHECK (type IN ('charge', 'refund', 'topup')),
    location VARCHAR(50) NOT NULL DEFAULT 'reception',
    description TEXT,
    performed_by UUID REFERENCES auth.users(id),
    is_synced BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 7. DEVICES (POS cihaz kaydı)
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL DEFAULT 'handheld'
        CHECK (device_type IN ('handheld', 'desktop', 'tablet', 'kiosk')),
    hardware_id VARCHAR(255),
    assigned_location VARCHAR(50),
    last_seen_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 8. AUDIT LOGS (Denetim logları)
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_tenant ON rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guests_room ON guests(room_id);
CREATE INDEX IF NOT EXISTS idx_guests_card_uid ON guests(card_uid);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_room ON transactions(room_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ══════════════════════════════════════════════
-- TRIGGER: Oda bakiyesini otomatik güncelle
-- BEFORE INSERT + FOR UPDATE ile race condition önlendi
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_room_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance NUMERIC(12, 2);
BEGIN
    -- Satırı kilitleyerek eşzamanlı erişimi önle
    SELECT wallet_balance INTO current_balance
    FROM rooms WHERE id = NEW.room_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found for id: %', NEW.room_id;
    END IF;

    IF NEW.type = 'charge' THEN
        IF current_balance < NEW.amount THEN
            RAISE EXCEPTION 'Insufficient room wallet balance for this charge. Current: %, Required: %', current_balance, NEW.amount;
        END IF;
        UPDATE rooms SET wallet_balance = wallet_balance - NEW.amount WHERE id = NEW.room_id;
    ELSIF NEW.type = 'topup' OR NEW.type = 'refund' THEN
        UPDATE rooms SET wallet_balance = wallet_balance + NEW.amount WHERE id = NEW.room_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_room_wallet_balance ON transactions;
CREATE TRIGGER trg_update_room_wallet_balance
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_room_wallet_balance();

-- ══════════════════════════════════════════════
-- TRIGGER: Yeni Auth kullanıcısı → otomatik profil oluştur
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'waiter')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- ══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- TENANTS policies
CREATE POLICY "tenants_select" ON tenants FOR SELECT USING (
    id = get_user_tenant_id() OR get_user_role() = 'super_admin'
);
-- Tenant oluşturma: super_admin veya henüz tenant'ı olmayan yeni kayıt kullanıcıları
CREATE POLICY "tenants_insert" ON tenants FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (auth.uid() IS NOT NULL AND get_user_tenant_id() IS NULL)
);
CREATE POLICY "tenants_update" ON tenants FOR UPDATE USING (
    (id = get_user_tenant_id() AND get_user_role() IN ('hotel_admin'))
    OR get_user_role() = 'super_admin'
);

-- PROFILES policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
    id = auth.uid()
    OR (tenant_id = get_user_tenant_id() AND get_user_role() IN ('hotel_admin','manager'))
    OR get_user_role() = 'super_admin'
);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
    id = auth.uid() OR get_user_role() = 'super_admin'
);

-- ROOMS policies
CREATE POLICY "rooms_all" ON rooms FOR ALL USING (
    tenant_id = get_user_tenant_id() OR get_user_role() = 'super_admin'
);

-- GUESTS policies
CREATE POLICY "guests_all" ON guests FOR ALL USING (
    room_id IN (SELECT id FROM rooms WHERE tenant_id = get_user_tenant_id())
    OR get_user_role() = 'super_admin'
);

-- TRANSACTIONS policies
CREATE POLICY "transactions_all" ON transactions FOR ALL USING (
    tenant_id = get_user_tenant_id() OR get_user_role() = 'super_admin'
);

-- LOCATIONS policies
CREATE POLICY "locations_all" ON locations FOR ALL USING (
    tenant_id = get_user_tenant_id() OR get_user_role() = 'super_admin'
);

-- DEVICES policies
CREATE POLICY "devices_all" ON devices FOR ALL USING (
    tenant_id = get_user_tenant_id() OR get_user_role() = 'super_admin'
);

-- AUDIT_LOGS policies
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
    tenant_id = get_user_tenant_id() AND get_user_role() IN ('hotel_admin','manager')
    OR get_user_role() = 'super_admin'
);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);

-- ══════════════════════════════════════════════
-- MIGRATION FOR EXISTING DATABASES
-- ══════════════════════════════════════════════
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'none';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 second';
ALTER TABLE tenants ALTER COLUMN status SET DEFAULT 'inactive';

-- ══════════════════════════════════════════════
-- 9. TICKETS (Destek Talepleri)
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    tenant_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_all" ON tickets FOR ALL USING (
    tenant_id = get_user_tenant_id() OR get_user_role() = 'super_admin'
);


