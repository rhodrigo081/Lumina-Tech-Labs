package lumina.tech.labs.app.engine;

import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Default, parameterizable implementation (FR01.2). Coefficients are
 * externalized via @Value so they can be tuned in application.yml without
 * a code change/redeploy — this is precisely why the Strategy interface
 * exists (see DiagnosticCalculationStrategy).
 */
@Component
public class DefaultDiagnosticCalculationStrategy implements DiagnosticCalculationStrategy {

    private final BigDecimal reductionFactor;
    private final BigDecimal investmentPerWorkstation;
    private final BigDecimal co2FactorPerReal;

    public DefaultDiagnosticCalculationStrategy(
            @Value("${lumina.diagnostic.reduction-factor:0.28}") BigDecimal reductionFactor,
            @Value("${lumina.diagnostic.investment-per-workstation:350}") BigDecimal investmentPerWorkstation,
            @Value("${lumina.diagnostic.co2-factor-per-real:0.00042}") BigDecimal co2FactorPerReal) {
        this.reductionFactor = reductionFactor;
        this.investmentPerWorkstation = investmentPerWorkstation;
        this.co2FactorPerReal = co2FactorPerReal;
    }

    @Override
    public DiagnosticEstimate calculate(DiagnosticInputRequest input) {
        BigDecimal monthlyBill = input.monthlyEnergyBill();
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
}
