package lumina.tech.labs.app.controller;

import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;
import lumina.tech.labs.app.dto.request.LeadCaptureRequest;
import lumina.tech.labs.app.dto.response.DiagnosticResponse;
import lumina.tech.labs.app.dto.response.LeadResponse;
import lumina.tech.labs.app.engine.DiagnosticCalculationStrategy;
import lumina.tech.labs.app.engine.DiagnosticEstimate;
import lumina.tech.labs.app.service.LeadService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class LeadController {

    private final LeadService leadService;
    private final DiagnosticCalculationStrategy diagnosticCalculationStrategy;

    public LeadController(LeadService leadService, DiagnosticCalculationStrategy diagnosticCalculationStrategy) {
        this.leadService = leadService;
        this.diagnosticCalculationStrategy = diagnosticCalculationStrategy;
    }

    /**
     * FR01.3 / FR03.1 — public endpoint (see SecurityConfig: no JWT required).
     * `Idempotency-Key` is optional but strongly recommended by the frontend
     * to make double form-submits safe.
     */
    @PostMapping("/leads")
    public ResponseEntity<LeadResponse> captureLead(@Valid @RequestBody LeadCaptureRequest request,
                                                      @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
                                                      HttpServletRequest httpRequest) {
        String sourceIp = extractClientIp(httpRequest);
        LeadResponse response = leadService.captureLead(request, idempotencyKey, sourceIp);
        return ResponseEntity.created(URI.create("/api/v1/leads/" + response.id())).body(response);
    }

    /**
     * FR01.2 — stateless preview calculation, never persisted, never gated.
     * Mirrors the client-side estimate so the visitor sees the same numbers
     * before AND after unlocking the full report.
     */
    @PostMapping("/diagnostics/preview")
    public ResponseEntity<DiagnosticResponse> previewDiagnostic(@Valid @RequestBody DiagnosticInputRequest request) {
        DiagnosticEstimate estimate = diagnosticCalculationStrategy.calculate(request);
        return ResponseEntity.ok(DiagnosticResponse.preview(
                estimate.consumptionReductionPct(), estimate.annualSavings(),
                estimate.paybackMonths(), estimate.co2ReductionTons()));
    }

    /** FR01.3 — report download. Kept public per the original spec (no sensitive PII in the PDF beyond what the lead itself submitted). */
    @GetMapping("/leads/{id}/report")
    public ResponseEntity<byte[]> downloadReport(@PathVariable UUID id) {
        // TODO: generate/fetch the PDF (itext7/pdfbox) for leadService.getLeadOrThrow(id).getDiagnostic()
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
