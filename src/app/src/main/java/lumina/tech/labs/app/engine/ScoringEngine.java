package lumina.tech.labs.app.engine;

import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;
import lumina.tech.labs.app.enums.Priority;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/** Implements FR03.2's qualification thresholds, also externalized for tuning. */
@Component
public class ScoringEngine {

    private final int highPriorityWorkstationsThreshold;
    private final BigDecimal highPriorityEnergyBillThreshold;

    public ScoringEngine(
            @Value("${lumina.scoring.high-priority-workstations:50}") int highPriorityWorkstationsThreshold,
            @Value("${lumina.scoring.high-priority-energy-bill:15000}") BigDecimal highPriorityEnergyBillThreshold) {
        this.highPriorityWorkstationsThreshold = highPriorityWorkstationsThreshold;
        this.highPriorityEnergyBillThreshold = highPriorityEnergyBillThreshold;
    }

    public Priority score(DiagnosticInputRequest diagnostic) {
        boolean bigWorkforce = diagnostic.workstations() > highPriorityWorkstationsThreshold;
        boolean highBill = diagnostic.monthlyEnergyBill().compareTo(highPriorityEnergyBillThreshold) > 0;
        return (bigWorkforce || highBill) ? Priority.HIGH_PRIORITY : Priority.MEDIUM_PRIORITY;
    }
}
