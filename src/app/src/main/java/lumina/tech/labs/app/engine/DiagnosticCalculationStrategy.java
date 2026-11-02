package lumina.tech.labs.app.engine;

import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;

public interface DiagnosticCalculationStrategy {
    DiagnosticEstimate calculate(DiagnosticInputRequest input);
}
