package lumina.tech.labs.app.dto.response;

import lumina.tech.labs.app.enums.Priority;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response of POST /api/v1/leads (201 Created).
 * Deliberately excludes phone/jobTitle/consent details — the response
 * only needs to confirm capture and hand back the report link; internal
 * fields stay out of the public contract (least-exposure principle).
 */
public record LeadResponse(
        UUID id,
        String fullName,
        String corporateEmail,
        String companyName,
        Priority priority,
        LocalDateTime createdAt,
        DiagnosticResponse diagnostic,
        String reportUrl
) {
}