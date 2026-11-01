package lumina.tech.labs.app.service;

import lumina.tech.labs.app.model.Diagnostic;
import lumina.tech.labs.app.model.Lead;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

/**
 * FR01.3 — builds the "full report" shown on the report page. Plain text for
 * now (the frontend renders it in a <pre>); swap for a PDF generator
 * (OpenPDF/PDFBox) when the visual report is designed.
 */
@Service
public class ReportService {

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    private final LeadService leadService;
    private final DateTimeFormatter dateFormat;

    public ReportService(LeadService leadService, @Value("${lumina.scheduling.zone:America/Sao_Paulo}") ZoneId zone) {
        this.leadService = leadService;
        this.dateFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", PT_BR).withZone(zone);
    }

    @Transactional(readOnly = true)
    public String buildTextReport(UUID leadId) {
        Lead lead = leadService.getLeadOrThrow(leadId);
        Diagnostic d = lead.getDiagnostic();
        NumberFormat money = NumberFormat.getCurrencyInstance(PT_BR);
        NumberFormat number = NumberFormat.getNumberInstance(PT_BR);
        number.setMaximumFractionDigits(2);

        BigDecimal monthlySavings = d.getAnnualSavings().divide(BigDecimal.valueOf(12), 2, java.math.RoundingMode.HALF_UP);

        return String.join("\n",
                "RELATÓRIO DE DIAGNÓSTICO ENERGÉTICO — LUMINA TECH LABS",
                "Protocolo: " + lead.getId(),
                "Emitido em: " + (d.getCalculatedAt() != null ? dateFormat.format(d.getCalculatedAt()) : "—") + " (horário de Brasília)",
                "",
                "CLIENTE",
                "  Empresa:      " + lead.getCompany().getName(),
                "  Responsável:  " + lead.getFullName() + " — " + lead.getJobTitle(),
                "  E-mail:       " + lead.getCorporateEmail(),
                "",
                "DADOS INFORMADOS",
                "  Área:                    " + number.format(d.getAreaM2()) + " m²",
                "  Estações de trabalho:    " + d.getWorkstations(),
                "  Fatura mensal de energia: " + money.format(d.getMonthlyEnergyBill()),
                "  Infraestrutura atual:    " + d.getCurrentInfrastructure(),
                "",
                "RESULTADOS ESTIMADOS",
                "  Redução de consumo:      " + number.format(d.getConsumptionReductionPct()) + "%",
                "  Economia mensal:         " + money.format(monthlySavings),
                "  Economia anual:          " + money.format(d.getAnnualSavings()),
                "  Payback estimado:        " + number.format(d.getPaybackMonths()) + " meses",
                "  CO₂ evitado por ano:     " + number.format(d.getCo2ReductionTons()) + " t",
                "",
                "Valores estimados a partir dos dados informados. A validação técnica é feita na sessão de diagnóstico",
                "com a equipe da Lumina Tech Labs.");
    }
}
