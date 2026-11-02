package lumina.tech.labs.app.model;

import lumina.tech.labs.app.enums.CrmProvider;
import lumina.tech.labs.app.enums.SyncStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

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
    private Instant syncedAt;
}
