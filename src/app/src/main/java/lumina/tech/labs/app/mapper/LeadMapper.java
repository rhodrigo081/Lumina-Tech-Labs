package lumina.tech.labs.app.mapper;

import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;
import lumina.tech.labs.app.dto.response.DiagnosticResponse;
import lumina.tech.labs.app.dto.response.LeadResponse;
import lumina.tech.labs.app.engine.DiagnosticEstimate;
import lumina.tech.labs.app.model.Diagnostic;
import lumina.tech.labs.app.model.Lead;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface LeadMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "lead", ignore = true)
    @Mapping(target = "calculatedAt", ignore = true)
    Diagnostic toEntity(DiagnosticInputRequest request, DiagnosticEstimate estimate);

    @Mapping(target = "companyName", source = "company.name")
    @Mapping(target = "reportUrl", expression = "java(\"/api/v1/leads/\" + lead.getId() + \"/report\")")
    LeadResponse toResponse(Lead lead);

    DiagnosticResponse toResponse(Diagnostic diagnostic);
}
