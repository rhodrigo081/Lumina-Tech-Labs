package lumina.tech.labs.app.event;

import java.util.UUID;

/** Published by ScheduleService after a meeting is successfully booked (FR02.3). */
public record ScheduleBookedEvent(UUID scheduleId, UUID leadId) {
}
