-- Production hardening for tenant integrity, RLS write checks, and card ownership.

ALTER TABLE guests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

UPDATE guests
SET tenant_id = rooms.tenant_id
FROM rooms
WHERE guests.room_id = rooms.id
  AND guests.tenant_id IS NULL;

DO $$
DECLARE
  orphan_guest RECORD;
BEGIN
  SELECT id, room_id
  INTO orphan_guest
  FROM guests
  WHERE tenant_id IS NULL
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Guest tenant_id backfill failed for guest id=% room_id=%',
      orphan_guest.id,
      orphan_guest.room_id;
  END IF;
END $$;

DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  SELECT tenant_id, card_uid, COUNT(*) AS duplicate_count
  INTO duplicate_record
  FROM guests
  WHERE status = 'active'
  GROUP BY tenant_id, card_uid
  HAVING COUNT(*) > 1
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Duplicate active card_uid found for tenant_id=% card_uid=% count=%',
      duplicate_record.tenant_id,
      duplicate_record.card_uid,
      duplicate_record.duplicate_count;
  END IF;
END $$;

ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_card_uid_key;
ALTER TABLE guests DROP CONSTRAINT IF EXISTS unique_tenant_card_uid;
ALTER TABLE guests ADD CONSTRAINT unique_tenant_card_uid UNIQUE(tenant_id, card_uid);
ALTER TABLE guests ALTER COLUMN tenant_id SET NOT NULL;

DO $$
DECLARE
  bad_tx RECORD;
BEGIN
  SELECT tx.id, tx.tenant_id, tx.room_id, tx.guest_id
  INTO bad_tx
  FROM transactions tx
  LEFT JOIN rooms r ON r.id = tx.room_id
  LEFT JOIN guests g ON g.id = tx.guest_id
  WHERE r.id IS NULL
     OR r.tenant_id <> tx.tenant_id
     OR (tx.guest_id IS NOT NULL AND (g.id IS NULL OR g.tenant_id <> tx.tenant_id OR g.room_id <> tx.room_id))
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Invalid transaction tenant integrity found for transaction id=% tenant_id=% room_id=% guest_id=%',
      bad_tx.id,
      bad_tx.tenant_id,
      bad_tx.room_id,
      bad_tx.guest_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION validate_transaction_tenant_integrity()
RETURNS TRIGGER AS $$
DECLARE
  room_tenant_id UUID;
  guest_tenant_id UUID;
  guest_room_id UUID;
BEGIN
  SELECT tenant_id INTO room_tenant_id
  FROM rooms
  WHERE id = NEW.room_id;

  IF room_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Room not found for transaction room_id=%', NEW.room_id;
  END IF;

  IF room_tenant_id <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Transaction tenant_id % does not match room tenant_id %', NEW.tenant_id, room_tenant_id;
  END IF;

  IF NEW.guest_id IS NOT NULL THEN
    SELECT tenant_id, room_id INTO guest_tenant_id, guest_room_id
    FROM guests
    WHERE id = NEW.guest_id;

    IF guest_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Guest not found for transaction guest_id=%', NEW.guest_id;
    END IF;

    IF guest_tenant_id <> NEW.tenant_id OR guest_room_id <> NEW.room_id THEN
      RAISE EXCEPTION 'Transaction guest_id % does not belong to tenant_id % and room_id %',
        NEW.guest_id,
        NEW.tenant_id,
        NEW.room_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_transaction_tenant_integrity ON transactions;
CREATE TRIGGER trg_validate_transaction_tenant_integrity
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION validate_transaction_tenant_integrity();

DROP POLICY IF EXISTS "rooms_all" ON rooms;
DROP POLICY IF EXISTS "rooms_select" ON rooms;
DROP POLICY IF EXISTS "rooms_insert" ON rooms;
DROP POLICY IF EXISTS "rooms_update" ON rooms;
DROP POLICY IF EXISTS "rooms_delete" ON rooms;
CREATE POLICY "rooms_select" ON rooms FOR SELECT USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "rooms_insert" ON rooms FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "rooms_update" ON rooms FOR UPDATE USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
) WITH CHECK (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "rooms_delete" ON rooms FOR DELETE USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);

DROP POLICY IF EXISTS "guests_all" ON guests;
DROP POLICY IF EXISTS "guests_select" ON guests;
DROP POLICY IF EXISTS "guests_insert" ON guests;
DROP POLICY IF EXISTS "guests_update" ON guests;
DROP POLICY IF EXISTS "guests_delete" ON guests;
CREATE POLICY "guests_select" ON guests FOR SELECT USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "guests_insert" ON guests FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "guests_update" ON guests FOR UPDATE USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
) WITH CHECK (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "guests_delete" ON guests FOR DELETE USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);

DROP POLICY IF EXISTS "transactions_all" ON transactions;
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
) WITH CHECK (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);

DROP POLICY IF EXISTS "locations_all" ON locations;
DROP POLICY IF EXISTS "locations_select" ON locations;
DROP POLICY IF EXISTS "locations_insert" ON locations;
DROP POLICY IF EXISTS "locations_update" ON locations;
DROP POLICY IF EXISTS "locations_delete" ON locations;
CREATE POLICY "locations_select" ON locations FOR SELECT USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "locations_insert" ON locations FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "locations_update" ON locations FOR UPDATE USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
) WITH CHECK (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "locations_delete" ON locations FOR DELETE USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);

DROP POLICY IF EXISTS "devices_all" ON devices;
DROP POLICY IF EXISTS "devices_select" ON devices;
DROP POLICY IF EXISTS "devices_insert" ON devices;
DROP POLICY IF EXISTS "devices_update" ON devices;
DROP POLICY IF EXISTS "devices_delete" ON devices;
CREATE POLICY "devices_select" ON devices FOR SELECT USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "devices_insert" ON devices FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "devices_update" ON devices FOR UPDATE USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
) WITH CHECK (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
CREATE POLICY "devices_delete" ON devices FOR DELETE USING (
  tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin', 'platform_owner')
);
