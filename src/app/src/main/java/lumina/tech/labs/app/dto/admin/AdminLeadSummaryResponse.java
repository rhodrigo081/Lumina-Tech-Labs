package lumina.tech.labs.app.dto.admin;

import lumina.tech.labs.app.dto.response.ScheduleResponse;
import lumina.tech.labs.app.enums.Priority;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AdminLeadSummaryResponse(
        UUID id,
        String fullName,
        String corporateEmail,
        String phone,
        String jobTitle,
        String companyName,
        Priority priority,
        Instant createdAt,
        Integer workstations,
        BigDecimal monthlyEnergyBill,
        BigDecimal annualSavings,
        ScheduleResponse meeting
) {
}
