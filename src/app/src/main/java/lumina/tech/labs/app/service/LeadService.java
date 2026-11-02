package lumina.tech.labs.app.service;

import lumina.tech.labs.app.dto.request.LeadCaptureRequest;
import lumina.tech.labs.app.dto.response.LeadResponse;
import lumina.tech.labs.app.mapper.LeadMapper;
import lumina.tech.labs.app.model.Company;
import lumina.tech.labs.app.model.ConsentLog;
import lumina.tech.labs.app.model.Diagnostic;
import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.event.LeadQualifiedEvent;
import lumina.tech.labs.app.engine.DiagnosticCalculationStrategy;
import lumina.tech.labs.app.engine.DiagnosticEstimate;
import lumina.tech.labs.app.engine.ScoringEngine;
import lumina.tech.labs.app.exception.DuplicateLeadException;
import lumina.tech.labs.app.exception.LeadNotFoundException;
import lumina.tech.labs.app.repository.CompanyRepository;
import lumina.tech.labs.app.repository.LeadRepository;
import lumina.tech.labs.app.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class LeadService {

    private final LeadRepository leadRepository;
    private final CompanyRepository companyRepository;
    private final DiagnosticCalculationStrategy diagnosticCalculationStrategy;
    private final ScoringEngine scoringEngine;
    private final LeadMapper leadMapper;
    private final IdempotencyService idempotencyService;
    private final ApplicationEventPublisher eventPublisher;
    private final String currentTermVersion;

    public LeadService(LeadRepository leadRepository,
                        CompanyRepository companyRepository,
                        DiagnosticCalculationStrategy diagnosticCalculationStrategy,
                        ScoringEngine scoringEngine,
                        LeadMapper leadMapper,
                        IdempotencyService idempotencyService,
                        ApplicationEventPublisher eventPublisher,
                        @Value("${lumina.consent.term-version:v1.0}") String currentTermVersion) {
        this.currentTermVersion = currentTermVersion;
        this.leadRepository = leadRepository;
        this.companyRepository = companyRepository;
        this.diagnosticCalculationStrategy = diagnosticCalculationStrategy;
        this.scoringEngine = scoringEngine;
        this.leadMapper = leadMapper;
        this.idempotencyService = idempotencyService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public LeadResponse captureLead(LeadCaptureRequest request, String idempotencyKey, String sourceIp) {
        IdempotencyService.Reservation reservation = null;
        if (idempotencyKey != null) {
            IdempotencyService.Result idempotency = idempotencyService.begin("lead", idempotencyKey);
            if (idempotency.completedResourceId().isPresent()) {
                return toResponse(getLeadOrThrow(idempotency.completedResourceId().get()));
            }
            reservation = idempotency.reservation();
        }

        if (!currentTermVersion.equals(request.consent().termVersion())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TERMS_VERSION_MISMATCH",
                    "The terms of use were updated. Reload the page and accept the current version.");
        }

        String email = request.corporateEmail().trim().toLowerCase();
        if (leadRepository.existsByCorporateEmail(email)) {
            throw new DuplicateLeadException(email);
        }

        Company company = findOrCreateCompany(request.companyName(), extractDomain(email));

        Diagnostic diagnostic = leadMapper.toEntity(request.diagnostic());
        DiagnosticEstimate estimate = diagnosticCalculationStrategy.calculate(request.diagnostic());
        diagnostic.setConsumptionReductionPct(estimate.consumptionReductionPct());
        diagnostic.setAnnualSavings(estimate.annualSavings());
        diagnostic.setPaybackMonths(estimate.paybackMonths());
        diagnostic.setCo2ReductionTons(estimate.co2ReductionTons());

        Lead lead = Lead.builder()
                .company(company)
                .fullName(request.fullName().trim())
                .corporateEmail(email)
                .phone(request.phone())
                .jobTitle(request.jobTitle().trim())
                .priority(scoringEngine.score(request.diagnostic()))
                .build();
        lead.assignDiagnostic(diagnostic);

        ConsentLog consent = ConsentLog.builder()
                .termVersion(request.consent().termVersion())
                .sourceIp(sourceIp)
                .build();
        lead.addConsentLog(consent);

        Lead saved = leadRepository.saveAndFlush(lead);
        if (reservation != null) {
            reservation.complete(saved.getId());
        }

        eventPublisher.publishEvent(new LeadQualifiedEvent(saved.getId(), saved.getPriority()));

        return toResponse(saved);
    }

    public LeadResponse toResponse(Lead lead) {
        LeadResponse response = leadMapper.toResponse(lead);
        return new LeadResponse(response.id(), response.fullName(), response.corporateEmail(),
                response.companyName(), response.priority(), response.createdAt(), response.diagnostic(),
                "/api/v1/leads/" + lead.getId() + "/report");
    }

    @Transactional(readOnly = true)
    public Lead getLeadOrThrow(UUID leadId) {
        return leadRepository.findWithDiagnosticById(leadId)
                .orElseThrow(() -> new LeadNotFoundException(leadId));
    }

    private Company findOrCreateCompany(String companyName, String emailDomain) {
        if (EmailDomains.isPersonal(emailDomain)) {
            return companyRepository.save(Company.builder().name(companyName.trim()).emailDomain(emailDomain).build());
        }
        return companyRepository.findFirstByEmailDomainOrderByCreatedAtAsc(emailDomain)
                .orElseGet(() -> companyRepository.save(
                        Company.builder().name(companyName.trim()).emailDomain(emailDomain).build()));
    }

    private String extractDomain(String email) {
        return email.substring(email.indexOf('@') + 1).toLowerCase().trim();
    }
}
