-- V2 — Admin area (technicians, bookable availability slots, admin users)
-- plus two fixes on the V1 schema:
--   * every TIMESTAMP becomes TIMESTAMPTZ (values stored by V1 were written in UTC
--     by the JVM running in the container, so they are reinterpreted as UTC);
--   * diagnostic.payback_months is widened — NUMERIC(6,2) overflowed (HTTP 500)
--     for large workstation counts combined with small energy bills.

-- ---------------------------------------------------------------------------
-- 1) Timezone-aware timestamps
-- ---------------------------------------------------------------------------
ALTER TABLE company      ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'UTC';
ALTER TABLE lead         ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'UTC';
ALTER TABLE lead         ALTER COLUMN updated_at    TYPE TIMESTAMPTZ USING updated_at    AT TIME ZONE 'UTC';
ALTER TABLE diagnostic   ALTER COLUMN calculated_at TYPE TIMESTAMPTZ USING calculated_at AT TIME ZONE 'UTC';
ALTER TABLE consent_log  ALTER COLUMN accepted_at   TYPE TIMESTAMPTZ USING accepted_at   AT TIME ZONE 'UTC';
ALTER TABLE schedule     ALTER COLUMN created_at    TYPE TIMESTAMPTZ USING created_at    AT TIME ZONE 'UTC';
ALTER TABLE schedule     ALTER COLUMN meeting_time  TYPE TIMESTAMPTZ USING meeting_time  AT TIME ZONE 'UTC';
ALTER TABLE crm_sync_log ALTER COLUMN synced_at     TYPE TIMESTAMPTZ USING synced_at     AT TIME ZONE 'UTC';

ALTER TABLE diagnostic ALTER COLUMN payback_months TYPE NUMERIC(12,2);

-- ---------------------------------------------------------------------------
-- 2) Technicians — the people a lead can book a diagnostic meeting with
-- ---------------------------------------------------------------------------
CREATE TABLE technician (
    id          UUID PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    specialty   VARCHAR(150),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_technician_email UNIQUE (email)
);

-- ---------------------------------------------------------------------------
-- 3) Availability slots created by admins. status: AVAILABLE | BOOKED.
--    Booking flips AVAILABLE -> BOOKED with a conditional UPDATE, which is
--    what prevents double booking under concurrency.
-- ---------------------------------------------------------------------------
CREATE TABLE availability_slot (
    id             UUID PRIMARY KEY,
    technician_id  UUID NOT NULL,
    start_time     TIMESTAMPTZ NOT NULL,
    end_time       TIMESTAMPTZ NOT NULL,
    status         VARCHAR(20) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_slot_technician FOREIGN KEY (technician_id) REFERENCES technician (id),
    CONSTRAINT uk_slot_technician_start UNIQUE (technician_id, start_time),
    CONSTRAINT ck_slot_range CHECK (end_time > start_time)
);
CREATE INDEX idx_slot_status_start ON availability_slot (status, start_time);

ALTER TABLE schedule ADD COLUMN technician_id     UUID;
ALTER TABLE schedule ADD COLUMN slot_id           UUID;
ALTER TABLE schedule ADD COLUMN calendar_event_id VARCHAR(255);
ALTER TABLE schedule ADD CONSTRAINT fk_schedule_technician FOREIGN KEY (technician_id) REFERENCES technician (id);
ALTER TABLE schedule ADD CONSTRAINT fk_schedule_slot FOREIGN KEY (slot_id) REFERENCES availability_slot (id);
CREATE INDEX idx_schedule_slot_id ON schedule (slot_id);

-- The V1 index served the removed "same SDR at the same time" check.
DROP INDEX IF EXISTS idx_schedule_sdr_meeting;

-- ---------------------------------------------------------------------------
-- 4) Admin users (internal area). Passwords are BCrypt hashes.
--    The first admin is created at startup from LUMINA_ADMIN_EMAIL /
--    LUMINA_ADMIN_PASSWORD (see AdminBootstrap) — never hardcoded here.
-- ---------------------------------------------------------------------------
CREATE TABLE admin_user (
    id             UUID PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    email          VARCHAR(255) NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at  TIMESTAMPTZ,
    CONSTRAINT uk_admin_user_email UNIQUE (email)
);
