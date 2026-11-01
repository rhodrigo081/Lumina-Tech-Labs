package lumina.tech.labs.app.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Relationship: COMPANY (1) -> (N) LEAD.
 * This is the INVERSE side ("mappedBy = company") — Company does not own
 * the foreign key. The FK (company_id) lives on the Lead table.
 * cascade = ALL + orphanRemoval = false: deleting a Company does NOT
 * automatically orphan-delete its leads (leads are historical records
 * that must survive independently of the company record).
 */
@Entity
@Table(name = "company", indexes = {
        @Index(name = "idx_company_email_domain", columnList = "email_domain")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    /**
     * Groups leads from the same corporate domain. Not unique: leads using a
     * personal provider (gmail.com, hotmail.com...) each get their own Company,
     * since the domain says nothing about who they work for.
     */
    @Column(name = "email_domain", nullable = false, length = 255)
    private String emailDomain;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "company", cascade = CascadeType.ALL, orphanRemoval = false, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private List<Lead> leads = new ArrayList<>();

    /** Convenience method to keep both sides of the bidirectional link in sync. */
    public void addLead(Lead lead) {
        leads.add(lead);
        lead.setCompany(this);
    }


}