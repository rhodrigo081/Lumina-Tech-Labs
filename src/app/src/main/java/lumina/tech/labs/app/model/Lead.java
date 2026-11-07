package lumina.tech.labs.app.model;

import lumina.tech.labs.app.enums.Priority;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, foreignKey = @ForeignKey(name = "fk_lead_company"))
    private Company company;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

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
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToOne(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Diagnostic diagnostic;

    @OneToOne(mappedBy = "lead", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Schedule schedule;

    @OneToMany(mappedBy = "lead", cascade = CascadeType.PERSIST, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    private List<ConsentLog> consentLogs = new ArrayList<>();

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
}
