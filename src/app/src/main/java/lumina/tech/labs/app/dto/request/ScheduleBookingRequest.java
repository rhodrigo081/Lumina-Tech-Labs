package lumina.tech.labs.app.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Body of POST /api/v1/schedule/book (FR02.2, FR02.3).
 * The lead picks one of the slots returned by GET /api/v1/schedule/slots;
 * time and technician come from the slot itself, never from the client.
 */
public record ScheduleBookingRequest(
        @NotNull(message = "leadId is required")
        UUID leadId,

        @NotNull(message = "slotId is required")
        UUID slotId
) {
}
