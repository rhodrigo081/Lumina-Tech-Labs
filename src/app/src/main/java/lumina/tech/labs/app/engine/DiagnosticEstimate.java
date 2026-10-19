package lumina.tech.labs.app.engine;

import java.math.BigDecimal;

/** Output of a DiagnosticCalculationStrategy (FR01.2). */
public record DiagnosticEstimate(
        BigDecimal consumptionReductionPct,
        BigDecimal annualSavings,
        BigDecimal paybackMonths,
        BigDecimal co2ReductionTons
) {
}
