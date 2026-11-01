package lumina.tech.labs.app.integration;

import java.time.Instant;
import java.util.List;

/**
 * Creates the video meeting for a booking (FR02.3). Selected with
 * {@code lumina.meeting.provider}: {@code jitsi} (default, no setup) or {@code google}.
 */
public interface MeetingProvider {

    /** Creates the room/event. Called inside the booking transaction, so it must be quick. */
    Meeting create(MeetingRequest request);

    /** Removes the event created by {@link #create}; no-op for providers without events. */
    void cancel(String externalId);

    record MeetingRequest(String title, String description, Instant start, Instant end, List<String> attendeeEmails) {
    }

    /**
     * @param externalId id on the provider side (e.g. Google Calendar event id), or null
     * @param joinUrl    link both sides use to join the call
     */
    record Meeting(String externalId, String joinUrl) {
    }
}
