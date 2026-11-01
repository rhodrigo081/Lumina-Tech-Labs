-- Personal email providers (gmail.com, hotmail.com...) are now accepted. Each of
-- those leads gets its own company row, so the domain can no longer be unique.
ALTER TABLE company DROP CONSTRAINT IF EXISTS uk_company_email_domain;
CREATE INDEX IF NOT EXISTS idx_company_email_domain ON company (email_domain);
