package lumina.tech.labs.app.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "consent_log")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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
    private Instant acceptedAt;

    void setLead(Lead lead) {
        this.lead = lead;
    }
}
