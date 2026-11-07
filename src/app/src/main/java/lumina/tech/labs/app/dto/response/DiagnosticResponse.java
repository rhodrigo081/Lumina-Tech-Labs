package lumina.tech.labs.app.dto.response;

import lumina.tech.labs.app.engine.DiagnosticEstimate;

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
    public static DiagnosticResponse preview(DiagnosticEstimate estimate) {
        return new DiagnosticResponse(null, null, null, null, null, estimate.consumptionReductionPct(),
                estimate.annualSavings(), estimate.paybackMonths(), estimate.co2ReductionTons(), null);
    }
}
