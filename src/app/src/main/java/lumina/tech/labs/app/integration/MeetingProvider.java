package lumina.tech.labs.app.integration;

import java.time.Instant;
import java.util.List;

public interface MeetingProvider {

    Meeting create(MeetingRequest request);

    void cancel(String externalId);

    record MeetingRequest(String title, String description, Instant start, Instant end, List<String> attendeeEmails) {
    }

    record Meeting(String externalId, String joinUrl) {
    }
}
