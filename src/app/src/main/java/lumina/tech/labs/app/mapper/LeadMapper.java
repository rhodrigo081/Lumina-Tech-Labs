package lumina.tech.labs.app.mapper;

import lumina.tech.labs.app.dto.request.DiagnosticInputRequest;
import lumina.tech.labs.app.dto.response.DiagnosticResponse;
import lumina.tech.labs.app.dto.response.LeadResponse;
import lumina.tech.labs.app.dto.response.ScheduleResponse;
import lumina.tech.labs.app.model.Diagnostic;
import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.model.Schedule;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * MapStruct keeps the mapping direction consistent with entity ownership:
 * request DTOs -> new (unsaved) entity fragments; entities -> response DTOs.
 * unmappedTargetPolicy = ERROR forces this interface to fail the build if a
 * new field is added to an entity/DTO and forgotten here — safer than
 * silently dropping data.
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface LeadMapper {

    // --- Request -> Entity -------------------------------------------------

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "lead", ignore = true) // set via Lead.assignDiagnostic(), not by the mapper
    @Mapping(target = "consumptionReductionPct", ignore = true) // filled by the ScoringEngine/DiagnosticEngine
    @Mapping(target = "annualSavings", ignore = true)
    @Mapping(target = "paybackMonths", ignore = true)
    @Mapping(target = "co2ReductionTons", ignore = true)
    @Mapping(target = "calculatedAt", ignore = true)
    Diagnostic toEntity(DiagnosticInputRequest request);

    // --- Entity -> Response --------------------------------------------------

    @Mapping(target = "companyName", source = "company.name")
    @Mapping(target = "reportUrl", ignore = true) // assembled by the service layer (signed URL / PDF endpoint)
    LeadResponse toResponse(Lead lead);

    DiagnosticResponse toResponse(Diagnostic diagnostic);

    @Mapping(target = "sdrAssigned", source = "sdrAssigned")
    ScheduleResponse toResponse(Schedule schedule);
}