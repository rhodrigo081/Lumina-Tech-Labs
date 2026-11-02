package lumina.tech.labs.app.service;

import lumina.tech.labs.app.enums.Priority;
import lumina.tech.labs.app.model.Company;
import lumina.tech.labs.app.model.Diagnostic;
import lumina.tech.labs.app.model.Lead;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class PdfReportServiceTest {

    @Test
    void pdfHasTheSameSectionsAndFiguresAsThePrintedReport() throws Exception {
        UUID id = UUID.fromString("3f2a9c1e-0000-4000-8000-000000000001");
        Lead lead = Lead.builder().id(id).fullName("Ana Souza").corporateEmail("ana@empresa.com.br")
                .priority(Priority.HIGH_PRIORITY)
                .company(Company.builder().name("Indústrias Reunidas S.A.").emailDomain("empresa.com.br").build())
                .build();
        lead.assignDiagnostic(Diagnostic.builder().areaM2(new BigDecimal("1200.50")).workstations(80)
                .monthlyEnergyBill(new BigDecimal("18000.00")).currentInfrastructure("CENTRAL_AC_MIXED_LIGHTING")
                .consumptionReductionPct(new BigDecimal("32.00")).annualSavings(new BigDecimal("69120.00"))
                .paybackMonths(new BigDecimal("4.9")).co2ReductionTons(new BigDecimal("29.03"))
                .calculatedAt(Instant.parse("2026-11-02T15:30:00Z")).build());
        LeadService leadService = mock(LeadService.class);
        given(leadService.getLeadOrThrow(id)).willReturn(lead);

        byte[] pdf = new PdfReportService(leadService, ZoneId.of("America/Sao_Paulo")).buildPdfReport(id);

        String outDir = System.getProperty("pdf.out");
        if (outDir != null) {
            java.nio.file.Files.write(java.nio.file.Path.of(outDir, "relatorio.pdf"), pdf);
        }
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            assertThat(doc.getNumberOfPages()).isEqualTo(1);
            String text = new PDFTextStripper().getText(doc);
            assertThat(text)
                    .contains("RELATÓRIO OFICIAL #3F2A9C1E")
                    .contains("Relatório de Auditoria Energética")
                    .contains("Indústrias Reunidas S.A.")
                    .contains("1.200,50 m²")
                    .contains("02/11/2026 12:30")
                    .contains("32,00%")
                    .contains("69.120,00")
                    .contains("5.760,00/mês")
                    .contains("4,9")
                    .contains("29,03")
                    .contains("216.000,00")
                    .contains("146.880,00")
                    .contains("Curva de Amortização")
                    .contains("Equilíbrio em 4,9 meses")
                    .contains("Mês 24");
        }
    }
}
