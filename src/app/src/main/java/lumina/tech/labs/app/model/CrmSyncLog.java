package lumina.tech.labs.app.model;

import lumina.tech.labs.app.enums.CrmProvider;
import lumina.tech.labs.app.enums.SyncStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Relationship: CRM_SYNC_LOG (N) -> (1) LEAD — OWNING side.
 * Deliberately NOT unique on lead_id: a single Lead can have multiple
 * rows here (e.g. one PENDING, one FAILURE from a timeout, one SUCCESS
 * after retry) — this table is an audit trail of the Outbox worker,
 * not a 1:1 status flag.
 */
@Entity
@Table(name = "crm_sync_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class CrmSyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lead_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_crm_sync_log_lead"))
    private Lead lead;

    @Enumerated(EnumType.STRING)
    @Column(name = "crm_provider", nullable = false, length = 30)
    private CrmProvider crmProvider;

    @Enumerated(EnumType.STRING)
    @Column(name = "sync_status", nullable = false, length = 20)
    private SyncStatus syncStatus;

    @Column(name = "external_crm_id", length = 100)
    private String externalCrmId;

    @CreationTimestamp
    @Column(name = "synced_at", updatable = false)
    private LocalDateTime syncedAt;
}