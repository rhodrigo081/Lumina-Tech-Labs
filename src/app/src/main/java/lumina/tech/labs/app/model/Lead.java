package lumina.tech.labs.app.model;

import com.luminatechlabs.platform.domain.enums.Priority;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Central entity of the domain. Holds four distinct relationships,
 * each with a different cardinality and ownership rule:
 *
 *  1) Lead (N) -> (1) Company        — OWNING side (holds company_id FK)
 *  2) Lead (1) -> (1) Diagnostic     — INVERSE side (Diagnostic owns lead_id, unique)
 *  3) Lead (1) -> (0..1) Schedule    — INVERSE side (Schedule owns lead_id, unique) — optional
 *  4) Lead (1) -> (N) ConsentLog     — INVERSE side (ConsentLog owns lead_id) — append-only
 *  5) Lead (1) -> (N) CrmSyncLog     — INVERSE side (CrmSyncLog owns lead_id) — history log
 */
@Entity
@Table(name = "lead", uniqueConstraints = {
        @UniqueConstraint(name = "uk_lead_corporate_email", columnNames = "corporate_email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    /**
     * OWNING side of a many-to-one: this table holds the FK column.
     * optional = false + nullable = false => every lead MUST belong to a company
     * (company is derived server-side from the corporate email domain).
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, foreignKey = @ForeignKey(name = "fk_lead_company"))
    private Company company;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    /** Deduplication key — also validated against generic domains before persisting. */
    @Column(name = "corporate_email", nullable = false, unique = true, length = 255)
    private String corporateEmail;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "job_title", length = 150)
    private String jobTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private Priority priority;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * 1:1, mandatory. mappedBy = "lead" => Diagnostic owns the FK (lead_id, UNIQUE).
     * cascade = ALL + orphanRemoval = true: a Diagnostic has no meaning without
     * its Lead — deleting/replacing the Lead's diagnostic deletes the orphan row.
     */
    @OneToOne(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Diagnostic diagnostic;

    /**
     * 1:0..1, optional. mappedBy = "lead" => Schedule owns the FK (lead_id, UNIQUE).
     * Nullable in practice: not every lead books a meeting.
     */
    @OneToOne(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Schedule schedule;

    /**
     * 1:N, append-only history. cascade = PERSIST only (never MERGE/REMOVE):
     * consent records must never be updated or deleted through the Lead's
     * lifecycle — they are legal evidence (LGPD/GDPR-style compliance).
     */
    @OneToMany(mappedBy = "lead", cascade = CascadeType.PERSIST, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private List<ConsentLog> consentLogs = new ArrayList<>();

    /**
     * 1:N, sync history (may contain retries: SUCCESS/FAILURE/PENDING entries
     * for the same lead). cascade = ALL because sync logs are fully owned by
     * the Lead's lifecycle and have no independent meaning.
     */
    @OneToMany(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private List<CrmSyncLog> crmSyncLogs = new ArrayList<>();

    // --- Convenience methods to keep bidirectional associations consistent ---

    public void assignDiagnostic(Diagnostic diagnostic) {
        this.diagnostic = diagnostic;
        diagnostic.setLead(this);
    }

    public void assignSchedule(Schedule schedule) {
        this.schedule = schedule;
        schedule.setLead(this);
    }

    public void addConsentLog(ConsentLog log) {
        consentLogs.add(log);
        log.setLead(this);
    }

    public void addCrmSyncLog(CrmSyncLog log) {
        crmSyncLogs.add(log);
        log.setLead(this);
    }
}