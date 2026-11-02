package lumina.tech.labs.app.event;

import java.util.UUID;

public record ScheduleBookedEvent(UUID scheduleId, UUID leadId) {
}
