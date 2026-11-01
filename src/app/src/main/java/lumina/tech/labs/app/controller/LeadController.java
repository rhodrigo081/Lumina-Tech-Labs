package lumina.tech.labs.app.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;
import lumina.tech.labs.app.dto.request.LeadCaptureRequest;
import lumina.tech.labs.app.dto.response.DiagnosticResponse;
import lumina.tech.labs.app.dto.response.LeadResponse;
import lumina.tech.labs.app.engine.DiagnosticCalculationStrategy;
import lumina.tech.labs.app.engine.DiagnosticEstimate;
import lumina.tech.labs.app.service.LeadService;
import lumina.tech.labs.app.service.ReportService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class LeadController {

    private static final MediaType TEXT_UTF8 = new MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8);

    private final LeadService leadService;
    private final ReportService reportService;
    private final DiagnosticCalculationStrategy diagnosticCalculationStrategy;

    public LeadController(LeadService leadService, ReportService reportService,
                          DiagnosticCalculationStrategy diagnosticCalculationStrategy) {
        this.leadService = leadService;
        this.reportService = reportService;
        this.diagnosticCalculationStrategy = diagnosticCalculationStrategy;
    }

    /**
     * FR01.3 / FR03.1 — public endpoint. `Idempotency-Key` is optional but
     * strongly recommended: a retry with the same key replays the original result.
     */
    @PostMapping("/leads")
    public ResponseEntity<LeadResponse> captureLead(@Valid @RequestBody LeadCaptureRequest request,
                                                    @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
                                                    HttpServletRequest httpRequest) {
        // getRemoteAddr() already resolves the real client IP: server.forward-headers-strategy=native
        // makes Tomcat trust X-Forwarded-For ONLY when it comes from an internal proxy (our nginx),
        // so a visitor can no longer forge the IP recorded in the LGPD consent log.
        LeadResponse response = leadService.captureLead(request, idempotencyKey, httpRequest.getRemoteAddr());
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

    /** FR01.3 — full report as plain text (rendered by the frontend). Public by lead id, per the original spec. */
    @GetMapping("/leads/{id}/report")
    public ResponseEntity<String> downloadReport(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(TEXT_UTF8).body(reportService.buildTextReport(id));
    }
}
