package lumina.tech.labs.app.dto.response;

import lumina.tech.labs.app.enums.Priority;

import java.time.Instant;
import java.util.UUID;

public record LeadResponse(
        UUID id,
        String fullName,
        String corporateEmail,
        String companyName,
        Priority priority,
        Instant createdAt,
        DiagnosticResponse diagnostic,
        String reportUrl
) {
}
