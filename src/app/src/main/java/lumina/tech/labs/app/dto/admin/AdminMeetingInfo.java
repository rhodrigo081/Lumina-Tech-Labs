package lumina.tech.labs.app.dto.admin;

import lumina.tech.labs.app.enums.ScheduleStatus;

import java.time.Instant;
import java.util.UUID;

public record AdminMeetingInfo(
        UUID id,
        UUID technicianId,
        String technicianName,
        Instant meetingTime,
        Instant endTime,
        String videoLink,
        ScheduleStatus status
) {
}
