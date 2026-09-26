# Software Design Document

### Lead Capture, Interactive Diagnostic, and Qualification Platform — Lumina Tech Labs

**Version:** 1.0 
**Based on:** Requirements Document v1.0 (09/19/2026)

---

## 1. Goal and Architectural Approach

The requirements define three functional blocks tightly coupled by data (capture → scheduling → sales integration) and a demanding set of NFRs (SEO/performance, data protection, scalability). The core design decision is:

> **Start as a Modular Monolith in Spring Boot, with module boundaries already designed as future microservices**, exposed behind an API Gateway, rather than jumping straight into distributed microservices.

**Rationale:** the domain (lead capture → scoring → scheduling → notification → CRM) has strong transactional consistency at the moment the lead is created (FR03.1–FR03.4 happen in sequence, within the same "unit of work"). Splitting this prematurely into separate services would add operational cost (orchestration, distributed observability, eventual consistency) without real benefit at the expected volume of a B2B landing page. The modular design allows any module (e.g., Scheduling or CRM Sync) to be extracted into its own service when traffic or team size demand it, without rewriting business rules — this satisfies NFR3.1/NFR3.2 (containers, auto-scaling) without day-one overhead.

---

## 2. Container Architecture (C4 — Level 2)

```mermaid
graph TB
    Visitor["B2B Visitor<br/>(Browser)"]
    Sales["Sales Consultant"]

    subgraph Edge["Edge Layer"]
        CDN["CDN / WAF"]
        GW["API Gateway<br/>(rate limiting, auth, routing)"]
    end

    subgraph Frontend["Frontend"]
        Angular["Angular SSR App<br/>(PWA, SEO, Core Web Vitals)"]
    end

    subgraph Backend["Backend — Spring Boot (Modular Monolith)"]
        LeadMod["Lead & Scoring Module"]
        SchedMod["Scheduling Module"]
        NotifMod["Notification Module"]
        CrmMod["CRM Integration Module"]
        ConsentMod["Consent Module"]
    end

    subgraph Data["Persistence"]
        PG[("PostgreSQL / Supabase")]
        Cache[("Redis — cache & idempotency")]
    end

    subgraph External["External Services"]
        Calendar["Google Calendar / Outlook"]
        Video["Meet / Teams / Zoom"]
        MailProvider["Email Provider (SES/SendGrid)"]
        ChatOps["Slack / Teams Webhook"]
        CRM["HubSpot / Salesforce / Pipefy / RD Station"]
    end

    Visitor -->|HTTPS/TLS 1.3| CDN --> GW --> Angular
    Angular -->|REST /api/v1| GW --> LeadMod
    LeadMod --> ConsentMod
    LeadMod --> PG
    LeadMod --> Cache
    LeadMod -->|event: qualified lead| NotifMod
    LeadMod -->|event: qualified lead| CrmMod
    Angular --> SchedMod
    SchedMod --> Calendar
    SchedMod --> Video
    SchedMod --> PG
    NotifMod --> MailProvider
    NotifMod --> ChatOps
    CrmMod --> CRM
    Sales --> ChatOps
    Sales --> CRM
```

**Role of each component:**

- **CDN/WAF**: caches static Angular SSR assets, mitigates DDoS/bots — supports NFR3.2.
- **API Gateway**: single entry point; applies rate limiting (protects the form from abuse) and validates JWTs for administrative routes.
- **Redis**: used for (a) caching calendar availability payloads, and (b) the idempotency key on `POST /api/v1/leads` (avoids duplicate leads from double-clicks/network timeouts).

---

## 3. Backend Module Decomposition (Spring Boot)

```mermaid
graph LR
    subgraph "lumina-backend (modular monolith)"
        API["Controller Layer<br/>(REST, DTOs, Bean Validation)"]
        Lead["lead-module<br/>LeadService, ScoringEngine"]
        Sched["scheduling-module<br/>CalendarSyncService"]
        Notif["notification-module<br/>EmailService, WebhookService"]
        Crm["crm-integration-module<br/>CrmAdapter (Strategy Pattern)"]
        Consent["consent-module<br/>Consent Ledger"]
        Diag["diagnostic-engine<br/>ROI/CO2 calculation rules"]
    end
    API --> Lead
    API --> Sched
    Lead --> Diag
    Lead --> Consent
    Lead -.async event.-> Notif
    Lead -.async event.-> Crm
    Sched --> Notif
```

**Design patterns applied:**

| Module | Pattern | Why |
| --- | --- | --- |
| `diagnostic-engine` | **Strategy** | The estimation rules (FR01.2) change frequently (marketing/sales adjust the formulas); isolating them into parameterizable strategies avoids a backend deployment for every formula tweak. |
| `crm-integration-module` | **Adapter/Strategy** | FR03.4 requires support for 4 distinct CRMs; one `CrmAdapter` per provider implementing a common interface (`sendLead(LeadDTO)`) avoids tightly coupled `if/else` logic. |
| `lead-module → notification/crm` | **Outbox Pattern + async events** | FR03.2/FR03.3 must not block the HTTP response to the visitor, nor fail silently if an external CRM goes down; the event is written in the same transaction as the lead and processed via a worker/queue. |
| `consent-module` | **Append-only ledger** | NFR2.1 requires legal traceability (timestamp, IP, accepted term version) — records must never be overwritten, only inserted. |

---

## 4. Sequence Flow — Capture and Qualification (FR01 → FR03)

```mermaid
sequenceDiagram
    actor V as Visitor
    participant FE as Angular SSR
    participant GW as API Gateway
    participant LM as Lead Module
    participant DE as Diagnostic Engine
    participant CM as Consent Module
    participant DB as PostgreSQL
    participant Q as Queue (Outbox)
    participant NM as Notification Module
    participant CRM as External CRM

    V->>FE: Enters m², workstations, energy bill
    FE->>DE: Calculates estimate (client-side preview)
    DE-->>FE: % savings, payback, tCO2 (preview)
    V->>FE: Fills in unlock form (Gated)
    FE->>GW: POST /api/v1/leads (data + consent)
    GW->>LM: forwards (rate-limited, idempotency-key)
    LM->>LM: validates corporate email domain
    LM->>CM: records consent (timestamp, IP, version)
    LM->>DE: recalculates official estimate (server-side)
    LM->>LM: applies ScoringEngine (FR03.2)
    LM->>DB: persists Lead + Diagnostic (single transaction)
    LM->>Q: publishes LeadQualified event (same transaction)
    LM-->>FE: 201 Created + PDF report/link
    Q-->>NM: consumes event
    NM->>V: email with report attached
    NM->>NM: notifies Slack/Teams (if HIGH_PRIORITY)
    Q-->>CRM: creates Opportunity (via CrmAdapter)
```

**Resilience points:** sending to the CRM and to the email provider happens **outside** the main HTTP transaction (via queue), with exponential retry. This way, instability in HubSpot doesn't break the visitor's experience — satisfies NFR3.2.

---

## 5. Sequence Flow — Scheduling (FR02)

```mermaid
sequenceDiagram
    actor V as Visitor/Lead
    participant FE as Angular SSR
    participant SM as Scheduling Module
    participant RC as Redis Cache
    participant GC as Google Calendar/Outlook
    participant VC as Meet/Teams/Zoom
    participant NM as Notification Module
    actor SDR as Consultant

    V->>FE: Clicks "Schedule diagnostic"
    FE->>SM: GET /api/v1/schedule/slots
    SM->>RC: checks availability cache (short TTL)
    alt cache expired
        SM->>GC: fetches real-time availability
        GC-->>SM: free time slots
        SM->>RC: updates cache
    end
    SM-->>FE: time slot grid
    V->>FE: picks a time slot
    FE->>SM: POST /api/v1/schedule/book
    SM->>GC: creates event (optimistic lock, anti double-booking)
    GC-->>SM: confirmation
    SM->>VC: generates video room
    VC-->>SM: meeting link
    SM->>NM: sends invites
    NM->>V: email with invite + link
    NM->>SDR: email/notification with invite + lead data
```

---

## 6. Data Model (ER)

```mermaid
erDiagram
    LEAD ||--|| DIAGNOSTIC : generates
    LEAD ||--o| SCHEDULE : schedules
    LEAD ||--|{ CONSENT_LOG : records
    LEAD ||--o{ CRM_SYNC_LOG : syncs
    COMPANY ||--o{ LEAD : employs

    COMPANY {
        uuid id PK
        string name
        string email_domain
    }
    LEAD {
        uuid id PK
        uuid company_id FK
        string full_name
        string corporate_email
        string phone
        string job_title
        string priority "HIGH / MEDIUM"
        timestamp created_at
    }
    DIAGNOSTIC {
        uuid id PK
        uuid lead_id FK
        numeric area_m2
        int workstations
        numeric monthly_energy_bill
        string current_infrastructure
        numeric consumption_reduction_pct
        numeric annual_savings
        numeric payback_months
        numeric co2_reduction_tons
    }
    CONSENT_LOG {
        uuid id PK
        uuid lead_id FK
        string term_version
        string source_ip
        timestamp accepted_at
    }
    SCHEDULE {
        uuid id PK
        uuid lead_id FK
        string sdr_assigned
        timestamp meeting_time
        string video_link
        string status
    }
    CRM_SYNC_LOG {
        uuid id PK
        uuid lead_id FK
        string crm_provider
        string sync_status
        timestamp synced_at
    }
```

`CONSENT_LOG` is **append-only** (never `UPDATE`/`DELETE`) to guarantee legal defensibility under data protection law.

---

## 7. API Design (main contract)

| Method | Endpoint | Description | FR |
| --- | --- | --- | --- |
| `POST` | `/api/v1/leads` | Lead + diagnostic + consent ingestion (idempotent via `Idempotency-Key` header) | FR01.3, FR03.1 |
| `GET` | `/api/v1/diagnostics/preview` | Client-side preview calculation (not persisted, not gated) | FR01.2 |
| `GET` | `/api/v1/schedule/slots?consultantId=` | Lists available time slots (cached) | FR02.1 |
| `POST` | `/api/v1/schedule/book` | Confirms booking + generates video room | FR02.2, FR02.3 |
| `GET` | `/api/v1/leads/{id}/report` | Downloads the diagnostic PDF | FR01.3 |

All input DTOs use Bean Validation (`@NotNull`, `@Email`, `@Pattern` to block generic domains), per NFR2.2.

---

## 8. Security and Data Protection (NFR02)

- **Transport:** TLS 1.3 required end-to-end (CDN → Gateway → Backend).
- **At rest:** sensitive columns (`corporate_email`, `phone`) encrypted at the column level (`pgcrypto` in Postgres/Supabase).
- **Input validation:** Bean Validation in the backend + HTML sanitization in the frontend before submission, a double layer against XSS.
- **Anti-abuse:** rate limiting at the Gateway per IP + invisible CAPTCHA on the unlock form, preventing scraping of the ROI calculator.
- **Consent:** consent, IP, and term version are recorded atomically (same transaction as the lead) — never in a separate process that could fail silently.

---

## 9. Scalability and Deployment (NFR03)

- **Packaging:** multi-stage Docker image (Maven build → slim JRE), stateless backend (JWT-based session, no sticky sessions) — ready for horizontal auto-scaling on Kubernetes/Cloud Run.
- **Campaign spikes:** the `POST /api/v1/leads` endpoint is the most critical under load; it writes and returns a response quickly, pushing anything "slow" (email, CRM, Slack) to the async queue — so auto-scaling reacts to write volume, not to third-party response times.
- **Circuit breaker:** calls to Google Calendar/CRM protected with Resilience4j, preventing an external failure from exhausting the backend's thread pool.
- **SSR/CDN:** Angular pages served via SSR with edge caching per route, reducing repeated Node/Angular server compute load during paid-traffic spikes.

---

## 10. Consolidated Stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular (SSR, PWA) |
| Gateway | Spring Cloud Gateway / Nginx |
| Backend | Java 21 + Spring Boot 3 (modular) |
| Queue/Events | Spring Events + Outbox (can evolve to Kafka/RabbitMQ if microservices are extracted) |
| Cache | Redis |
| Database | PostgreSQL (Supabase) |
| Infrastructure | Docker + Kubernetes / Cloud Run |
| Observability | Micrometer + OpenTelemetry (tracing the Lead → CRM flow) |

---

### Natural next candidate for extraction

If volume grows, the **`scheduling-module`** is the first candidate for extraction (I/O-bound, depends on external calendar APIs, scales independently of the capture flow).