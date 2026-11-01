package lumina.tech.labs.app.dto.admin;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * Generates slots for one technician: for each date, from `startTime` to
 * `endTime` (local time in lumina.scheduling.zone — Brasília), one slot of
 * `durationMinutes` followed by `breakMinutes` of pause, repeatedly.
 * Example: 09:00-12:00, 45 min + 15 min pause => 09:00, 10:00, 11:00.
 */
public record AdminSlotBatchRequest(
        @NotNull(message = "technicianId is required")
        UUID technicianId,

        @NotEmpty(message = "choose at least one date")
        @Size(max = 62, message = "at most 62 dates per request")
        List<@NotNull LocalDate> dates,

        @NotNull(message = "startTime is required")
        LocalTime startTime,

        @NotNull(message = "endTime is required")
        LocalTime endTime,

        @NotNull(message = "durationMinutes is required")
        @Min(value = 15, message = "durationMinutes must be at least 15")
        @Max(value = 240, message = "durationMinutes must be at most 240")
        Integer durationMinutes,

        @Min(value = 0, message = "breakMinutes cannot be negative")
        @Max(value = 120, message = "breakMinutes must be at most 120")
        Integer breakMinutes
) {
}
