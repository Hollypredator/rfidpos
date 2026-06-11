-- ══════════════════════════════════════════════
-- RFID POS SaaS — Supabase Demo Seeding Script
-- ══════════════════════════════════════════════

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Demo Hotel (Tenant)
INSERT INTO public.tenants (id, name, slug, status, subscription_plan, subscription_expires_at)
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'Demo Otel', 
  'demo-otel', 
  'active', 
  'pro', 
  NOW() + INTERVAL '1 year'
)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name;

-- 2. Create Users in Supabase Auth (auth.users)
-- All users password will be: demo1234

-- Otel Admini
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'admin@hotelpos.com',
  crypt('demo1234', gen_salt('bf', 10)),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo Otel Yöneticisi","role":"hotel_admin"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Süper Admin
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'super@hotelpos.com',
  crypt('demo1234', gen_salt('bf', 10)),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo Süper Yönetici","role":"super_admin"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Garson (POS)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token
)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'waiter@hotelpos.com',
  crypt('demo1234', gen_salt('bf', 10)),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo Garson","role":"waiter"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Resepsiyonist
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token
)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '00000000-0000-0000-0000-000000000000',
  'receptionist@hotelpos.com',
  crypt('demo1234', gen_salt('bf', 10)),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo Resepsiyonist","role":"receptionist"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- 3. Link Profiles to the Tenant (Except Super Admin) (And create if missing)
INSERT INTO public.profiles (id, tenant_id, full_name, email, role, is_active)
VALUES 
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Demo Otel Yöneticisi', 'admin@hotelpos.com', 'hotel_admin', true),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Demo Garson', 'waiter@hotelpos.com', 'waiter', true),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Demo Resepsiyonist', 'receptionist@hotelpos.com', 'receptionist', true)
ON CONFLICT (id) DO UPDATE 
SET tenant_id = EXCLUDED.tenant_id, role = EXCLUDED.role, full_name = EXCLUDED.full_name;

UPDATE public.profiles
SET tenant_id = '11111111-1111-1111-1111-111111111111'
WHERE email IN ('admin@hotelpos.com', 'waiter@hotelpos.com', 'receptionist@hotelpos.com');

-- Set tenant owner to be admin@hotelpos.com
UPDATE public.tenants
SET owner_id = '22222222-2222-2222-2222-222222222222'
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 4. Create Locations for the Demo Hotel
INSERT INTO public.locations (id, tenant_id, name, slug, icon, is_active)
VALUES 
  ('12121212-1212-1212-1212-121212121212', '11111111-1111-1111-1111-111111111111', 'Ana Restoran', 'restoran', 'Utensils', true),
  ('13131313-1313-1313-1313-131313131313', '11111111-1111-1111-1111-111111111111', 'Lobi Bar', 'bar', 'GlassWater', true),
  ('14141414-1414-1414-1414-141414141414', '11111111-1111-1111-1111-111111111111', 'Spa & Wellness', 'spa', 'Sparkles', true),
  ('15151515-1515-1515-1515-151515151515', '11111111-1111-1111-1111-111111111111', 'Resepsiyon', 'reception', 'ConciergeBell', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Create Demo Rooms (Wallets)
INSERT INTO public.rooms (id, tenant_id, room_number, wallet_balance, pin_code, status)
VALUES 
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0', '11111111-1111-1111-1111-111111111111', '101', 1500.00, '1234', 'occupied'),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0', '11111111-1111-1111-1111-111111111111', '102', 350.00, '4321', 'occupied'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0', '11111111-1111-1111-1111-111111111111', '103', 0.00, '0000', 'active'),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', '11111111-1111-1111-1111-111111111111', '104', 4200.00, '2580', 'occupied'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0', '11111111-1111-1111-1111-111111111111', '105', 120.00, '9876', 'maintenance')
ON CONFLICT (id) DO NOTHING;

-- 6. Create Demo Guests with active RFID UIDs
INSERT INTO public.guests (id, tenant_id, room_id, guest_name, card_uid, status)
VALUES 
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0', 'Can Yılmaz', 'A1B2C3D4', 'active'),
  ('f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', '11111111-1111-1111-1111-111111111111', 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0', 'John Doe', 'B5C6D7E8', 'active'),
  ('f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2', '11111111-1111-1111-1111-111111111111', 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'Merve Kaya', 'E5F6G7H8', 'active')
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════
-- FUNTASIA ENTERTAINMENT CENTER DEMO SEEDING
-- ══════════════════════════════════════════════

-- 1. Create Funtasia Tenant
INSERT INTO public.tenants (id, name, slug, status, subscription_plan, subscription_expires_at, settings)
VALUES (
  '99999999-9999-9999-9999-999999999999', 
  'Funtasia Eğlence Merkezi', 
  'funtasia-eglence', 
  'active', 
  'pro', 
  NOW() + INTERVAL '1 year',
  '{"business_type": "entertainment", "daily_spending_limit": 1000}'::jsonb
)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, settings = EXCLUDED.settings;

-- 2. Create Funtasia Users (Auth)
-- Admin: fun_admin@hotelpos.com
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
VALUES (
  '11112222-3333-4444-5555-666677778888',
  '00000000-0000-0000-0000-000000000000',
  'fun_admin@hotelpos.com',
  crypt('demo1234', gen_salt('bf', 10)),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Funtasia Yönetici","role":"hotel_admin"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Receptionist/Kasa: fun_kasa@hotelpos.com
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
VALUES (
  '11112222-3333-4444-5555-666677779999',
  '00000000-0000-0000-0000-000000000000',
  'fun_kasa@hotelpos.com',
  crypt('demo1234', gen_salt('bf', 10)),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Funtasia Kasa Görevlisi","role":"receptionist"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- Waiter/Garson: fun_waiter@hotelpos.com
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
VALUES (
  '11112222-3333-4444-5555-666677770000',
  '00000000-0000-0000-0000-000000000000',
  'fun_waiter@hotelpos.com',
  crypt('demo1234', gen_salt('bf', 10)),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Funtasia Garson","role":"waiter"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- 3. Link Profiles to Funtasia Tenant (And create if missing)
INSERT INTO public.profiles (id, tenant_id, full_name, email, role, is_active)
VALUES 
  ('11112222-3333-4444-5555-666677778888', '99999999-9999-9999-9999-999999999999', 'Funtasia Yönetici', 'fun_admin@hotelpos.com', 'hotel_admin', true),
  ('11112222-3333-4444-5555-666677779999', '99999999-9999-9999-9999-999999999999', 'Funtasia Kasa Görevlisi', 'fun_kasa@hotelpos.com', 'receptionist', true),
  ('11112222-3333-4444-5555-666677770000', '99999999-9999-9999-9999-999999999999', 'Funtasia Garson', 'fun_waiter@hotelpos.com', 'waiter', true)
ON CONFLICT (id) DO UPDATE 
SET tenant_id = EXCLUDED.tenant_id, role = EXCLUDED.role, full_name = EXCLUDED.full_name;

UPDATE public.profiles
SET tenant_id = '99999999-9999-9999-9999-999999999999'
WHERE email IN ('fun_admin@hotelpos.com', 'fun_kasa@hotelpos.com', 'fun_waiter@hotelpos.com');

-- Set Funtasia Tenant owner to be fun_admin
UPDATE public.tenants
SET owner_id = '11112222-3333-4444-5555-666677778888'
WHERE id = '99999999-9999-9999-9999-999999999999';

-- 4. Create Locations for Funtasia
INSERT INTO public.locations (id, tenant_id, name, slug, icon, is_active)
VALUES 
  ('88888888-8888-8888-8888-888888888888', '99999999-9999-9999-9999-999999999999', 'Danışma & Kasa', 'reception', 'ConciergeBell', true),
  ('88888888-8888-8888-8888-888888888889', '99999999-9999-9999-9999-999999999999', 'VR Oyun Alanı', 'vr-zone', 'Gamepad2', true),
  ('88888888-8888-8888-8888-888888888890', '99999999-9999-9999-9999-999999999999', 'Trambolin Parkı', 'trampoline', 'Activity', true),
  ('88888888-8888-8888-8888-888888888891', '99999999-9999-9999-9999-999999999999', 'Kafe & Bar', 'bar', 'Coffee', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Create Funtasia Wristband Wallets (Rooms)
INSERT INTO public.rooms (id, tenant_id, room_number, wallet_balance, pin_code, status)
VALUES 
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e02011', '99999999-9999-9999-9999-999999999999', '201', 500.00, '1234', 'occupied'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e02022', '99999999-9999-9999-9999-999999999999', '202', 150.00, '4321', 'occupied'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e02033', '99999999-9999-9999-9999-999999999999', '203', 0.00, '0000', 'active')
ON CONFLICT (id) DO NOTHING;

-- 6. Create Funtasia Customers (Guests)
INSERT INTO public.guests (id, tenant_id, room_id, guest_name, card_uid, status)
VALUES 
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f02011', '99999999-9999-9999-9999-999999999999', 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e02011', 'Alp Eren', 'E1E2E3E4', 'active'),
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f02022', '99999999-9999-9999-9999-999999999999', 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e02022', 'Selin Yılmaz', 'D1D2D3D4', 'active')
ON CONFLICT (id) DO NOTHING;
