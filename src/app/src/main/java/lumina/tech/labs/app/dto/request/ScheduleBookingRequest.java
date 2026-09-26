package lumina.tech.labs.app.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Body of POST /api/v1/schedule/book (FR02.2, FR02.3).
 * `leadId` + `startTime` + `consultantId` are validated server-side
 * against the cached availability grid before creating the Google
 * Calendar/Outlook event (optimistic locking prevents double booking).
 */
public record ScheduleBookingRequest(

        @NotNull(message = "leadId is required")
        UUID leadId,

        @NotBlank(message = "consultantId is required")
        String consultantId,

        @NotNull(message = "startTime is required")
        @Future(message = "startTime must be in the future")
        LocalDateTime startTime
) {
}