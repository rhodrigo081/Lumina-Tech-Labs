package lumina.tech.labs.app.service;

import lumina.tech.labs.app.dto.request.ConsentRequest;
import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;
import lumina.tech.labs.app.dto.request.LeadCaptureRequest;
import lumina.tech.labs.app.engine.DefaultDiagnosticCalculationStrategy;
import lumina.tech.labs.app.engine.ScoringEngine;
import lumina.tech.labs.app.mapper.LeadMapperImpl;
import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.repository.LeadRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import({LeadService.class, DefaultDiagnosticCalculationStrategy.class, ScoringEngine.class, LeadMapperImpl.class})
class LeadCompanyGroupingTest {

    @MockitoBean
    IdempotencyService idempotencyService;

    @Autowired LeadService leadService;
    @Autowired LeadRepository leadRepository;

    @Test
    void personalEmailsAreAcceptedAndKeepTheirOwnCompany() {
        UUID first = leadService.captureLead(request("maria@gmail.com", "Padaria Central"), null, "10.0.0.1").id();
        UUID second = leadService.captureLead(request("joao@GMAIL.com", "Oficina Silva"), null, "10.0.0.1").id();

        Lead maria = leadRepository.findDetailedById(first).orElseThrow();
        Lead joao = leadRepository.findDetailedById(second).orElseThrow();
        assertThat(joao.getCorporateEmail()).isEqualTo("joao@gmail.com");
        assertThat(maria.getCompany().getId()).isNotEqualTo(joao.getCompany().getId());
        assertThat(maria.getCompany().getName()).isEqualTo("Padaria Central");
        assertThat(joao.getCompany().getName()).isEqualTo("Oficina Silva");
    }

    @Test
    void corporateEmailsAreStillGroupedByDomain() {
        UUID first = leadService.captureLead(request("ana@acme.com.br", "ACME"), null, "10.0.0.1").id();
        UUID second = leadService.captureLead(request("bia@acme.com.br", "Acme Ltda"), null, "10.0.0.1").id();

        assertThat(leadRepository.findDetailedById(first).orElseThrow().getCompany().getId())
                .isEqualTo(leadRepository.findDetailedById(second).orElseThrow().getCompany().getId());
    }

    private static LeadCaptureRequest request(String email, String company) {
        return new LeadCaptureRequest("Pessoa Teste", email, "(81) 99999-0001", "Gerente", company,
                new DiagnosticInputRequest(new BigDecimal("500"), 20, new BigDecimal("8000"), "STANDARD_CORPORATE_BUILDING"),
                new ConsentRequest("v1.1", true));
    }
}
