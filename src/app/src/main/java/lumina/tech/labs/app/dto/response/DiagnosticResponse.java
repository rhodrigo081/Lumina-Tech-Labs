package lumina.tech.labs.app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response for a persisted Diagnostic (FR01.2), nested inside LeadResponse.
 * `id` is nullable when used for the unsaved /diagnostics/preview
 * calculation (client-side estimate, not yet persisted per FR01.2).
 */
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
        LocalDateTime calculatedAt
) {
    /** Factory for the unsaved preview response (GET /api/v1/diagnostics/preview). */
    public static DiagnosticResponse preview(BigDecimal consumptionReductionPct,
                                             BigDecimal annualSavings,
                                             BigDecimal paybackMonths,
                                             BigDecimal co2ReductionTons) {
        return new DiagnosticResponse(null, null, null, null, null,
                consumptionReductionPct, annualSavings, paybackMonths, co2ReductionTons, null);
    }
}