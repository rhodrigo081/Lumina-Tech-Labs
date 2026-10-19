package lumina.tech.labs.app.integration;

import org.springframework.stereotype.Component;

import java.util.UUID;

/** TODO: replace with a real Google Meet/Teams/Zoom API call. */
@Component
public class GoogleMeetVideoRoomClient implements VideoRoomClient {

    @Override
    public String createRoom(String meetingTitle) {
        return "https://meet.google.com/" + UUID.randomUUID().toString().substring(0, 10);
    }
}
