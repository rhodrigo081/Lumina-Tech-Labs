package lumina.tech.labs.app.engine;

import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class DefaultDiagnosticCalculationStrategy implements DiagnosticCalculationStrategy {

    private static final BigDecimal HIGH_DENSITY_WORKSTATIONS_PER_M2 = new BigDecimal("0.08");
    private static final BigDecimal LOW_DENSITY_WORKSTATIONS_PER_M2 = new BigDecimal("0.02");
    private static final BigDecimal DENSITY_ADJUSTMENT = new BigDecimal("0.03");
    private static final BigDecimal MIN_REDUCTION = new BigDecimal("0.10");
    private static final BigDecimal MAX_REDUCTION = new BigDecimal("0.42");

    private final BigDecimal investmentPerWorkstation;
    private final BigDecimal co2FactorPerReal;

    public DefaultDiagnosticCalculationStrategy(
            @Value("${lumina.diagnostic.investment-per-workstation:350}") BigDecimal investmentPerWorkstation,
            @Value("${lumina.diagnostic.co2-factor-per-real:0.00042}") BigDecimal co2FactorPerReal) {
        this.investmentPerWorkstation = investmentPerWorkstation;
        this.co2FactorPerReal = co2FactorPerReal;
    }

    @Override
    public DiagnosticEstimate calculate(DiagnosticInputRequest input) {
        BigDecimal monthlyBill = input.monthlyEnergyBill();
        BigDecimal reductionFactor = reductionFactor(input);
        BigDecimal reductionPct = reductionFactor.multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal monthlySavings = monthlyBill.multiply(reductionFactor);
        BigDecimal annualSavings = monthlySavings.multiply(BigDecimal.valueOf(12))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal estimatedInvestment = BigDecimal.valueOf(input.workstations())
                .multiply(investmentPerWorkstation);

        BigDecimal paybackMonths = monthlySavings.compareTo(BigDecimal.ZERO) > 0
                ? estimatedInvestment.divide(monthlySavings, 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal co2ReductionTons = annualSavings.multiply(co2FactorPerReal)
                .setScale(2, RoundingMode.HALF_UP);

        return new DiagnosticEstimate(reductionPct, annualSavings, paybackMonths, co2ReductionTons);
    }

    private BigDecimal reductionFactor(DiagnosticInputRequest input) {
        BigDecimal factor = InfrastructureProfile.valueOf(input.currentInfrastructure()).baseReduction();
        BigDecimal density = BigDecimal.valueOf(input.workstations())
                .divide(input.areaM2(), 4, RoundingMode.HALF_UP);
        if (density.compareTo(HIGH_DENSITY_WORKSTATIONS_PER_M2) > 0) {
            factor = factor.add(DENSITY_ADJUSTMENT);
        } else if (density.compareTo(LOW_DENSITY_WORKSTATIONS_PER_M2) < 0) {
            factor = factor.subtract(DENSITY_ADJUSTMENT);
        }
        return factor.max(MIN_REDUCTION).min(MAX_REDUCTION);
    }
}
