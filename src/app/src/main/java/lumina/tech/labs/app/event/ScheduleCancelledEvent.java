package lumina.tech.labs.app.event;

import java.util.UUID;

/** Published when an admin cancels a meeting; handled after commit (calendar cleanup + email to the lead). */
public record ScheduleCancelledEvent(UUID scheduleId) {
}
