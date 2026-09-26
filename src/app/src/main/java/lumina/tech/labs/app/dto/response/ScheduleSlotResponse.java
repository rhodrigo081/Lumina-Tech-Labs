package lumina.tech.labs.app.dto.response;

import java.time.LocalDateTime;

/**
 * A single bookable slot returned by GET /api/v1/schedule/slots (FR02.1).
 * Built from the Redis-cached Google Calendar/Outlook availability query.
 */
public record ScheduleSlotResponse(
        String consultantId,
        String consultantName,
        LocalDateTime startTime,
        LocalDateTime endTime
) {
}
