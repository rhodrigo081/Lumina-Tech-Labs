package lumina.tech.labs.app.integration;

/** Abstraction over Google Meet / Teams / Zoom room creation (FR02.3). */
public interface VideoRoomClient {
    String createRoom(String meetingTitle);
}
