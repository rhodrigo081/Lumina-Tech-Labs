package lumina.tech.labs.app.service;

import lumina.tech.labs.app.engine.InfrastructureProfile;
import lumina.tech.labs.app.model.Diagnostic;
import lumina.tech.labs.app.model.Lead;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import static lumina.tech.labs.app.service.ReportFormat.currency;

@Service
public class ReportService {

    private final LeadService leadService;
    private final DateTimeFormatter dateFormat;

    public ReportService(LeadService leadService, @Value("${lumina.scheduling.zone:America/Sao_Paulo}") ZoneId zone) {
        this.leadService = leadService;
        this.dateFormat = ReportFormat.dateTime(zone);
    }

    @Transactional(readOnly = true)
    public String buildTextReport(UUID leadId) {
        Lead lead = leadService.getLeadOrThrow(leadId);
        Diagnostic d = lead.getDiagnostic();
        BigDecimal monthlySavings = d.getAnnualSavings().divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);

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
                "  Área:                    " + number(d.getAreaM2()) + " m²",
                "  Estações de trabalho:    " + d.getWorkstations(),
                "  Fatura mensal de energia: " + currency(d.getMonthlyEnergyBill()),
                "  Infraestrutura atual:    " + InfrastructureProfile.labelOf(d.getCurrentInfrastructure()),
                "",
                "RESULTADOS ESTIMADOS",
                "  Redução de consumo:      " + number(d.getConsumptionReductionPct()) + "%",
                "  Economia mensal:         " + currency(monthlySavings),
                "  Economia anual:          " + currency(d.getAnnualSavings()),
                "  Payback estimado:        " + number(d.getPaybackMonths()) + " meses",
                "  CO₂ evitado por ano:     " + number(d.getCo2ReductionTons()) + " t",
                "",
                "Valores estimados a partir dos dados informados. A validação técnica é feita na sessão de diagnóstico",
                "com a equipe da Lumina Tech Labs.");
    }

    private static String number(BigDecimal value) {
        return ReportFormat.number(value, 0, 2);
    }
}
