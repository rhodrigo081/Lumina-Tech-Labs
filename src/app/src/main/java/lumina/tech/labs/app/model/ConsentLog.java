package lumina.tech.labs.app.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Relationship: CONSENT_LOG (N) -> (1) LEAD — OWNING side (holds lead_id FK).
 *
 * DESIGN INTENT — APPEND-ONLY ENTITY:
 * This entity intentionally has NO public setters (field access is used by
 * Hibernate by default, since @Id is placed on a field). Consent rows are
 * legal evidence (timestamp, IP, term version) and must never be UPDATEd
 * or DELETEd once persisted — only INSERTed. The repository layer for this
 * entity should expose save()/findBy...() only, never update/delete methods.
 */
@Entity
@Table(name = "consent_log")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED) // required by JPA, not for app use
@AllArgsConstructor(access = AccessLevel.PACKAGE)
@EqualsAndHashCode(of = "id")
public class ConsentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lead_id", nullable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_consent_log_lead"))
    private Lead lead;

    @Column(name = "term_version", nullable = false, updatable = false, length = 50)
    private String termVersion;

    @Column(name = "source_ip", nullable = false, updatable = false, length = 45)
    private String sourceIp;

    @CreationTimestamp
    @Column(name = "accepted_at", updatable = false)
    private LocalDateTime acceptedAt;

    /** Package-visible on purpose: only Lead.addConsentLog() should call this, to keep both sides in sync. */
    void setLead(Lead lead) {
        this.lead = lead;
    }
}