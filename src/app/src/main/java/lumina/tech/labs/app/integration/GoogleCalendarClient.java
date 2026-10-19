package lumina.tech.labs.app.integration;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Placeholder implementation — replace with a real Google Calendar API
 * (google-api-services-calendar) or Microsoft Graph client. Kept here so
 * the module compiles and is testable end-to-end before credentials for
 * the real provider are available.
 */
@Component
public class GoogleCalendarClient implements CalendarClient {

    @Override
    public List<TimeSlot> fetchAvailability(String consultantId, LocalDateTime from, LocalDateTime to) {
        // TODO: replace with a real call to the Google Calendar freebusy API.
        return Stream.iterate(from, t -> t.isBefore(to), t -> t.plusHours(1))
                .map(t -> new TimeSlot(t, t.plus(Duration.ofMinutes(45))))
                .collect(Collectors.toList());
    }

    @Override
    public String createEvent(String consultantId, LocalDateTime start, LocalDateTime end, String leadEmail) {
        // TODO: replace with a real Google Calendar events.insert() call.
        return "gcal-event-" + UUID.randomUUID();
    }
}
