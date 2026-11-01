package lumina.tech.labs.app.dto.admin;

import lumina.tech.labs.app.dto.response.DiagnosticResponse;
import lumina.tech.labs.app.enums.CrmProvider;
import lumina.tech.labs.app.enums.Priority;
import lumina.tech.labs.app.enums.SyncStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminLeadDetailResponse(
        UUID id,
        String fullName,
        String corporateEmail,
        String phone,
        String jobTitle,
        String companyName,
        String companyDomain,
        Priority priority,
        Instant createdAt,
        DiagnosticResponse diagnostic,
        AdminMeetingInfo meeting,
        List<Consent> consents,
        List<CrmSync> crmSyncs
) {
    public record Consent(String termVersion, String sourceIp, Instant acceptedAt) {
    }

    public record CrmSync(CrmProvider provider, SyncStatus status, String externalId, Instant syncedAt) {
    }
}
