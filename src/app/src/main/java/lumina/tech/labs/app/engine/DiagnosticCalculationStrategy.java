package lumina.tech.labs.app.engine;

import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;

/**
 * Strategy pattern (see design doc, section 3): the ROI/savings formula
 * changes often as marketing/sales tune it, so it is isolated behind this
 * interface instead of hardcoded inline in LeadService. Swapping the
 * @Primary bean (or wiring a different one per campaign/AB-test) requires
 * no change to the service layer.
 */
public interface DiagnosticCalculationStrategy {
    DiagnosticEstimate calculate(DiagnosticInputRequest input);
}
