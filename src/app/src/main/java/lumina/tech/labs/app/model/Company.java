package lumina.tech.labs.app.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
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
@Table(name = "company", uniqueConstraints = {
        @UniqueConstraint(name = "uk_company_email_domain", columnNames = "email_domain")
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
     * Used to (a) group leads from the same company and (b) block
     * generic domains (gmail.com, hotmail.com) at validation time.
     */
    @Column(name = "email_domain", nullable = false, unique = true, length = 255)
    private String emailDomain;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

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