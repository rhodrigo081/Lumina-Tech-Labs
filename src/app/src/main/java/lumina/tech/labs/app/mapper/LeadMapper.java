package lumina.tech.labs.app.mapper;

import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;
import lumina.tech.labs.app.dto.response.DiagnosticResponse;
import lumina.tech.labs.app.dto.response.LeadResponse;
import lumina.tech.labs.app.model.Diagnostic;
import lumina.tech.labs.app.model.Lead;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface LeadMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "lead", ignore = true)
    @Mapping(target = "consumptionReductionPct", ignore = true)
    @Mapping(target = "annualSavings", ignore = true)
    @Mapping(target = "paybackMonths", ignore = true)
    @Mapping(target = "co2ReductionTons", ignore = true)
    @Mapping(target = "calculatedAt", ignore = true)
    Diagnostic toEntity(DiagnosticInputRequest request);

    @Mapping(target = "companyName", source = "company.name")
    @Mapping(target = "reportUrl", ignore = true)
    LeadResponse toResponse(Lead lead);

    DiagnosticResponse toResponse(Diagnostic diagnostic);
}
