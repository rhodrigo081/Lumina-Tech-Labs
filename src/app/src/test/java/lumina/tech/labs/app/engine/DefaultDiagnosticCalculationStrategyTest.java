package lumina.tech.labs.app.engine;

import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class DefaultDiagnosticCalculationStrategyTest {

    private final DefaultDiagnosticCalculationStrategy strategy =
            new DefaultDiagnosticCalculationStrategy(new BigDecimal("350"), new BigDecimal("0.00042"));

    private BigDecimal reduction(String infrastructure, int workstations, String area) {
        return strategy.calculate(new DiagnosticInputRequest(new BigDecimal(area), workstations,
                new BigDecimal("18000"), infrastructure)).consumptionReductionPct();
    }

    @Test
    void reductionDependsOnTheInfrastructure() {
        assertThat(reduction("CENTRAL_AC_MIXED_LIGHTING", 80, "1200")).isEqualByComparingTo("32");
        assertThat(reduction("STANDARD_CORPORATE_BUILDING", 80, "1200")).isEqualByComparingTo("24");
        assertThat(reduction("LOGISTICS_WAREHOUSE", 80, "1200")).isEqualByComparingTo("30");
        assertThat(reduction("PARTIAL_RETROFIT", 80, "1200")).isEqualByComparingTo("15");
    }

    @Test
    void occupancyDensityAdjustsTheReduction() {
        assertThat(reduction("STANDARD_CORPORATE_BUILDING", 200, "1200")).isEqualByComparingTo("27");
        assertThat(reduction("STANDARD_CORPORATE_BUILDING", 10, "1200")).isEqualByComparingTo("21");
        assertThat(reduction("PARTIAL_RETROFIT", 10, "1200")).isEqualByComparingTo("12");
    }
}
