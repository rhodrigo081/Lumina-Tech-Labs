package lumina.tech.labs.app.dto.response;

import lumina.tech.labs.app.enums.ScheduleStatus;

import java.time.Instant;
import java.util.UUID;

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
