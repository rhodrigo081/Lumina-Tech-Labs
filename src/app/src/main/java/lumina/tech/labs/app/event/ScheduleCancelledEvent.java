package lumina.tech.labs.app.event;

import java.util.UUID;

public record ScheduleCancelledEvent(UUID scheduleId) {
}
