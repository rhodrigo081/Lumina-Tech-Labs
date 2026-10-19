-- Lumina Tech Labs — initial schema
-- Mirrors the JPA entities in com.luminatechlabs.platform.domain.entity 1:1,
-- including the same constraint names used in @ForeignKey(name = "...").

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE company (
    id            UUID PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email_domain  VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_company_email_domain UNIQUE (email_domain)
);

CREATE TABLE lead (
    id               UUID PRIMARY KEY,
    company_id       UUID NOT NULL,
    full_name        VARCHAR(255) NOT NULL,
    corporate_email  VARCHAR(255) NOT NULL,
    phone            VARCHAR(30),
    job_title        VARCHAR(150),
    priority         VARCHAR(20) NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP,
    CONSTRAINT uk_lead_corporate_email UNIQUE (corporate_email),
    CONSTRAINT fk_lead_company FOREIGN KEY (company_id) REFERENCES company (id)
);
CREATE INDEX idx_lead_company_id ON lead (company_id);
CREATE INDEX idx_lead_priority ON lead (priority);

-- 1:1 with lead — enforced by the UNIQUE constraint on lead_id, not just by app logic.
CREATE TABLE diagnostic (
    id                          UUID PRIMARY KEY,
    lead_id                     UUID NOT NULL,
    area_m2                     NUMERIC(10,2),
    workstations                INTEGER,
    monthly_energy_bill         NUMERIC(12,2),
    current_infrastructure      VARCHAR(255),
    consumption_reduction_pct   NUMERIC(5,2),
    annual_savings              NUMERIC(12,2),
    payback_months              NUMERIC(6,2),
    co2_reduction_tons          NUMERIC(10,2),
    calculated_at               TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_diagnostic_lead_id UNIQUE (lead_id),
    CONSTRAINT fk_diagnostic_lead FOREIGN KEY (lead_id) REFERENCES lead (id)
);

-- Append-only: no UPDATE/DELETE should ever target this table (see ConsentLogRepository).
CREATE TABLE consent_log (
    id            UUID PRIMARY KEY,
    lead_id       UUID NOT NULL,
    term_version  VARCHAR(50) NOT NULL,
    source_ip     VARCHAR(45) NOT NULL,
    accepted_at   TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_consent_log_lead FOREIGN KEY (lead_id) REFERENCES lead (id)
);
CREATE INDEX idx_consent_log_lead_id ON consent_log (lead_id);

-- 0..1 with lead — UNIQUE on lead_id guarantees at most one Schedule per Lead.
CREATE TABLE schedule (
    id            UUID PRIMARY KEY,
    lead_id       UUID NOT NULL,
    sdr_assigned  VARCHAR(150),
    meeting_time  TIMESTAMP,
    video_link    VARCHAR(500),
    status        VARCHAR(20) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uk_schedule_lead_id UNIQUE (lead_id),
    CONSTRAINT fk_schedule_lead FOREIGN KEY (lead_id) REFERENCES lead (id)
);
CREATE INDEX idx_schedule_sdr_meeting ON schedule (sdr_assigned, meeting_time);

-- 1:N with lead on purpose — multiple rows per lead (retries), see CrmSyncLogRepository.
CREATE TABLE crm_sync_log (
    id               UUID PRIMARY KEY,
    lead_id          UUID NOT NULL,
    crm_provider     VARCHAR(30) NOT NULL,
    sync_status      VARCHAR(20) NOT NULL,
    external_crm_id  VARCHAR(100),
    synced_at        TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_crm_sync_log_lead FOREIGN KEY (lead_id) REFERENCES lead (id)
);
CREATE INDEX idx_crm_sync_log_lead_id ON crm_sync_log (lead_id);
CREATE INDEX idx_crm_sync_log_status ON crm_sync_log (sync_status);