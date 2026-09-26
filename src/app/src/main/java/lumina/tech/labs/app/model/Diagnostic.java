package lumina.tech.labs.app.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Relationship: DIAGNOSTIC (1) <-> (1) LEAD — mandatory, OWNING side.
 * @JoinColumn(unique = true) is what actually enforces the 1:1 cardinality
 * at the database level (a plain @OneToOne without `unique = true` on a
 * FK column would only be enforced by application logic, not the schema).
 * optional = false: a Diagnostic cannot exist without a Lead.
 */
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

    /** Also used as a scoring input (FR03.2) alongside monthlyEnergyBill. */
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

    @Column(name = "payback_months", precision = 6, scale = 2)
    private BigDecimal paybackMonths;

    @Column(name = "co2_reduction_tons", precision = 10, scale = 2)
    private BigDecimal co2ReductionTons;

    @CreationTimestamp
    @Column(name = "calculated_at", updatable = false)
    private LocalDateTime calculatedAt;
}