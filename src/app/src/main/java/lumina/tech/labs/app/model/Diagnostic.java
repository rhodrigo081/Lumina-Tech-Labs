package lumina.tech.labs.app.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "diagnostic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Diagnostic {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lead_id", nullable = false, unique = true,
            foreignKey = @ForeignKey(name = "fk_diagnostic_lead"))
    private Lead lead;

    @Column(name = "area_m2", precision = 10, scale = 2)
    private BigDecimal areaM2;

    @Column(name = "workstations")
    private Integer workstations;

    @Column(name = "monthly_energy_bill", precision = 12, scale = 2)
    private BigDecimal monthlyEnergyBill;

    @Column(name = "current_infrastructure", length = 255)
    private String currentInfrastructure;

    @Column(name = "consumption_reduction_pct", precision = 5, scale = 2)
    private BigDecimal consumptionReductionPct;

    @Column(name = "annual_savings", precision = 12, scale = 2)
    private BigDecimal annualSavings;

    @Column(name = "payback_months", precision = 12, scale = 2)
    private BigDecimal paybackMonths;

    @Column(name = "co2_reduction_tons", precision = 10, scale = 2)
    private BigDecimal co2ReductionTons;

    @CreationTimestamp
    @Column(name = "calculated_at", updatable = false)
    private Instant calculatedAt;
}
