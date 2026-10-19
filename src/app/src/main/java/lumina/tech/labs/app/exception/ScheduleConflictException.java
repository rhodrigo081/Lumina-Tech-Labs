package lumina.tech.labs.app.exception;

import java.time.LocalDateTime;

/** Thrown when the requested slot is no longer free (FR02.2 anti double-booking). */
public class ScheduleConflictException extends RuntimeException {
    public ScheduleConflictException(String consultantId, LocalDateTime meetingTime) {
        super("Consultant " + consultantId + " is no longer available at " + meetingTime);
    }
}
