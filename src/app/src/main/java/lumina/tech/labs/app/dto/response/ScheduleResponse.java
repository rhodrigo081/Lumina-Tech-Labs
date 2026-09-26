package lumina.tech.labs.app.dto.response;

import lumina.tech.labs.app.enums.ScheduleStatus;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response of POST /api/v1/schedule/book (FR02.2, FR02.3) —
 * confirms the meeting and returns the generated video room link.
 */
public record ScheduleResponse(
        UUID id,
        String sdrAssigned,
        LocalDateTime meetingTime,
        String videoLink,
        ScheduleStatus status
) {
}