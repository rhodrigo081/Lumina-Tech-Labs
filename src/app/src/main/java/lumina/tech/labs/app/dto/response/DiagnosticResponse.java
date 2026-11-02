package lumina.tech.labs.app.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record DiagnosticResponse(
        UUID id,
        BigDecimal areaM2,
        Integer workstations,
        BigDecimal monthlyEnergyBill,
        String currentInfrastructure,
        BigDecimal consumptionReductionPct,
        BigDecimal annualSavings,
        BigDecimal paybackMonths,
        BigDecimal co2ReductionTons,
        Instant calculatedAt
) {
    public static DiagnosticResponse preview(BigDecimal consumptionReductionPct,
                                             BigDecimal annualSavings,
                                             BigDecimal paybackMonths,
                                             BigDecimal co2ReductionTons) {
        return new DiagnosticResponse(null, null, null, null, null,
                consumptionReductionPct, annualSavings, paybackMonths, co2ReductionTons, null);
    }
}
