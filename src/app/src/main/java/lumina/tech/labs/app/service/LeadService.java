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
import lumina.tech.labs.app.engine.ScoringEngine;
import lumina.tech.labs.app.exception.DuplicateLeadException;
import lumina.tech.labs.app.exception.LeadNotFoundException;
import lumina.tech.labs.app.repository.CompanyRepository;
import lumina.tech.labs.app.repository.LeadRepository;
import lumina.tech.labs.app.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
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
                        @Value("${lumina.consent.term-version:v1.1}") String currentTermVersion) {
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
                return leadMapper.toResponse(getLeadOrThrow(idempotency.completedResourceId().get()));
            }
            reservation = idempotency.reservation();
        }

        if (!currentTermVersion.equals(request.consent().termVersion())) {
            throw ApiException.badRequest("TERMS_VERSION_MISMATCH",
                    "The terms of use were updated. Reload the page and accept the current version.");
        }

        String email = request.corporateEmail().trim().toLowerCase();
        if (leadRepository.existsByCorporateEmail(email)) {
            throw new DuplicateLeadException(email);
        }

        Company company = findOrCreateCompany(request.companyName(), email.substring(email.indexOf('@') + 1));

        Diagnostic diagnostic = leadMapper.toEntity(request.diagnostic(),
                diagnosticCalculationStrategy.calculate(request.diagnostic()));

        Lead lead = Lead.builder()
                .company(company)
                .fullName(request.fullName().trim())
                .corporateEmail(email)
                .phone(request.phone())
                .jobTitle(request.jobTitle().trim())
                .priority(scoringEngine.score(request.diagnostic()))
                .build();
        lead.assignDiagnostic(diagnostic);

        lead.addConsentLog(ConsentLog.builder()
                .termVersion(request.consent().termVersion())
                .sourceIp(sourceIp)
                .build());

        Lead saved = leadRepository.saveAndFlush(lead);
        if (reservation != null) {
            reservation.complete(saved.getId());
        }

        eventPublisher.publishEvent(new LeadQualifiedEvent(saved.getId()));

        return leadMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Lead getLeadOrThrow(UUID leadId) {
        return leadRepository.findWithDiagnosticById(leadId)
                .orElseThrow(() -> new LeadNotFoundException(leadId));
    }

    /** Leads with a personal email (gmail.com...) never share a company; corporate domains do. */
    private Company findOrCreateCompany(String companyName, String emailDomain) {
        return (EmailDomains.isPersonal(emailDomain)
                ? Optional.<Company>empty()
                : companyRepository.findFirstByEmailDomainOrderByCreatedAtAsc(emailDomain))
                .orElseGet(() -> companyRepository.save(
                        Company.builder().name(companyName.trim()).emailDomain(emailDomain).build()));
    }
}
