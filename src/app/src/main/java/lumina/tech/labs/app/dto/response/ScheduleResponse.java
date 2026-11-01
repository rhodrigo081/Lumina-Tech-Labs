package lumina.tech.labs.app.dto.response;

import lumina.tech.labs.app.enums.ScheduleStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Response of POST /api/v1/schedule/book (FR02.2, FR02.3) —
 * confirms the meeting and returns the generated video room link.
 * `sdrAssigned` is kept for backwards compatibility and holds the technician name.
 */
public record ScheduleResponse(
        UUID id,
        UUID technicianId,
        String technicianName,
        String sdrAssigned,
        Instant meetingTime,
        Instant endTime,
        String videoLink,
        ScheduleStatus status
) {
}
