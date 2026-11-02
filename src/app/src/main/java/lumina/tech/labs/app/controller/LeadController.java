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

    @PostMapping("/leads")
    public ResponseEntity<LeadResponse> captureLead(@Valid @RequestBody LeadCaptureRequest request,
                                                    @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
                                                    HttpServletRequest httpRequest) {
        LeadResponse response = leadService.captureLead(request, idempotencyKey, httpRequest.getRemoteAddr());
        return ResponseEntity.created(URI.create("/api/v1/leads/" + response.id())).body(response);
    }

    @PostMapping("/diagnostics/preview")
    public ResponseEntity<DiagnosticResponse> previewDiagnostic(@Valid @RequestBody DiagnosticInputRequest request) {
        DiagnosticEstimate estimate = diagnosticCalculationStrategy.calculate(request);
        return ResponseEntity.ok(DiagnosticResponse.preview(
                estimate.consumptionReductionPct(), estimate.annualSavings(),
                estimate.paybackMonths(), estimate.co2ReductionTons()));
    }

    @GetMapping("/leads/{id}/report")
    public ResponseEntity<String> downloadReport(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(TEXT_UTF8).body(reportService.buildTextReport(id));
    }
}
