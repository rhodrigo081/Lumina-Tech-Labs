package lumina.tech.labs.app.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ScheduleBookingRequest(
        @NotNull(message = "leadId is required")
        UUID leadId,

        @NotNull(message = "slotId is required")
        UUID slotId
) {
}
