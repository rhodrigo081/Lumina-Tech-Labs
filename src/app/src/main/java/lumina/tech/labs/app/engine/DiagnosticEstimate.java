package lumina.tech.labs.app.engine;

import java.math.BigDecimal;

public record DiagnosticEstimate(
        BigDecimal consumptionReductionPct,
        BigDecimal annualSavings,
        BigDecimal paybackMonths,
        BigDecimal co2ReductionTons
) {
}
