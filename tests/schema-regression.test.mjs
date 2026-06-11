import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../supabase/migrations/20260604000000_init.sql', import.meta.url), 'utf8');
const projectUrl = (path) => new URL(`../${path}`, import.meta.url);
const rootSeed = readFileSync(projectUrl('supabase_seed_data.sql'), 'utf8');

assert.match(
  schema,
  /CREATE TABLE IF NOT EXISTS guests\s*\([\s\S]*tenant_id UUID NOT NULL REFERENCES tenants\(id\)/,
  'guests must store tenant_id directly so card ownership is tenant-scoped'
);

assert.doesNotMatch(
  schema,
  /card_uid VARCHAR\(100\) UNIQUE NOT NULL/,
  'card_uid must not be globally unique across all tenants'
);

assert.match(
  schema,
  /UNIQUE\s*\(\s*tenant_id\s*,\s*card_uid\s*\)/,
  'card_uid uniqueness must be scoped by tenant_id'
);

const initGuestTenantCompatIndex = schema.indexOf('ALTER TABLE guests ADD COLUMN IF NOT EXISTS tenant_id');
const initGuestTenantIndexIndex = schema.indexOf('CREATE INDEX IF NOT EXISTS idx_guests_tenant ON guests(tenant_id)');
assert.ok(
  initGuestTenantCompatIndex !== -1 && initGuestTenantCompatIndex < initGuestTenantIndexIndex,
  'init migration must add guests.tenant_id before creating tenant_id indexes or policies on existing databases'
);

assert.match(
  schema,
  /CHECK\s*\(\s*type IN \('[^']*charge[\s\S]*deposit[\s\S]*deposit_refund[\s\S]*'\)\s*\)/,
  'transactions.type must accept deposit and deposit_refund records used by reception'
);

assert.doesNotMatch(
  rootSeed,
  /INSERT INTO public\.guests \(id, room_id, guest_name, card_uid, status\)/,
  'root seed data must include guests.tenant_id when inserting guests'
);

const hardeningMigrationPath = projectUrl('supabase/migrations/20260611000000_production_hardening.sql');
assert.equal(
  existsSync(hardeningMigrationPath),
  true,
  'production hardening migration must exist separately from init migration'
);

const hardeningMigration = readFileSync(hardeningMigrationPath, 'utf8');

assert.match(
  hardeningMigration,
  /ALTER TABLE guests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants\(id\) ON DELETE CASCADE/,
  'production hardening migration must add guests.tenant_id for databases that already ran the original init migration'
);

assert.match(
  hardeningMigration,
  /UPDATE guests\s+SET tenant_id = rooms\.tenant_id\s+FROM rooms/,
  'production hardening migration must backfill guests.tenant_id from rooms before enforcing card uniqueness'
);

assert.match(
  hardeningMigration,
  /RAISE EXCEPTION 'Duplicate active card_uid found for tenant_id=%/,
  'migration must fail loudly when duplicate tenant-scoped card UIDs exist'
);

assert.match(
  hardeningMigration,
  /CREATE OR REPLACE FUNCTION validate_transaction_tenant_integrity\(\)/,
  'migration must add transaction tenant-integrity validation'
);

assert.match(
  hardeningMigration,
  /DROP TRIGGER IF EXISTS trg_validate_transaction_tenant_integrity ON transactions/,
  'migration must install a transaction tenant-integrity trigger'
);

for (const table of ['rooms', 'guests', 'transactions', 'locations', 'devices']) {
  assert.match(
    hardeningMigration,
    new RegExp(`CREATE POLICY "${table}_insert"[\\s\\S]*WITH CHECK`),
    `${table} must have an explicit INSERT WITH CHECK policy`
  );
  assert.match(
    hardeningMigration,
    new RegExp(`CREATE POLICY "${table}_update"[\\s\\S]*WITH CHECK`),
    `${table} must have an explicit UPDATE WITH CHECK policy`
  );
}

const adminRoutePath = projectUrl('src/app/api/admin/users/route.ts');
assert.equal(existsSync(adminRoutePath), true, 'admin user API route must exist');

const adminRoute = readFileSync(adminRoutePath, 'utf8');
const adminHelper = readFileSync(projectUrl('src/utils/supabase-admin.ts'), 'utf8');
assert.match(adminRoute, /auth\.admin\.createUser/, 'admin API must create real Supabase Auth users');
assert.match(adminHelper, /SUPABASE_SERVICE_ROLE_KEY/, 'admin API must use a server-only service role key');
assert.match(adminRoute, /hotel_admin/, 'admin API must enforce hotel_admin tenant-scoped authorization');

const middleware = readFileSync(projectUrl('src/middleware.ts'), 'utf8');
assert.match(
  middleware,
  /process\.env\.NODE_ENV !== 'production'/,
  'middleware mock-mode bypass must be development-only'
);

const browserSupabase = readFileSync(projectUrl('src/utils/supabase.ts'), 'utf8');
assert.match(
  browserSupabase,
  /throw new Error\('Supabase environment variables are required in production\.'/,
  'browser Supabase client must fail closed in production when env vars are missing'
);

assert.equal(existsSync(projectUrl('.eslintrc.json')), true, 'ESLint config must exist so npm run lint is non-interactive');

const envExample = readFileSync(projectUrl('.env.example'), 'utf8');
assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here/, '.env.example must document service role key');
