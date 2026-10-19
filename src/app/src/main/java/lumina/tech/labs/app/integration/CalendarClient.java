package lumina.tech.labs.app.integration;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Abstraction over Google Calendar / Microsoft Outlook (FR02.2).
 * Kept as an interface so ScheduleService never depends on a specific
 * provider's SDK — swap the @Bean implementation per environment.
 */
public interface CalendarClient {

    List<TimeSlot> fetchAvailability(String consultantId, LocalDateTime from, LocalDateTime to);

    /** Creates the calendar event and returns the provider's own event id. */
    String createEvent(String consultantId, LocalDateTime start, LocalDateTime end, String leadEmail);

    record TimeSlot(LocalDateTime start, LocalDateTime end) {
    }
}
