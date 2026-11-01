package lumina.tech.labs.app.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Jitsi Meet rooms need no API call: any room name is a valid, working room.
 * The name carries 100 random bits, so it cannot be guessed.
 */
@Component
@ConditionalOnProperty(name = "lumina.meeting.provider", havingValue = "jitsi", matchIfMissing = true)
public class JitsiMeetingProvider implements MeetingProvider {

    private static final char[] ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789".toCharArray(); // 32 symbols
    private static final int ROOM_SUFFIX_LENGTH = 20;

    private final SecureRandom random = new SecureRandom();
    private final String baseUrl;
    private final String roomPrefix;

    public JitsiMeetingProvider(@Value("${lumina.meeting.jitsi.base-url:https://meet.jit.si}") String baseUrl,
                                @Value("${lumina.meeting.jitsi.room-prefix:LuminaTechLabs}") String roomPrefix) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.roomPrefix = roomPrefix;
    }

    @Override
    public Meeting create(MeetingRequest request) {
        StringBuilder room = new StringBuilder(roomPrefix).append('-');
        for (int i = 0; i < ROOM_SUFFIX_LENGTH; i++) {
            room.append(ALPHABET[random.nextInt(ALPHABET.length)]);
        }
        return new Meeting(null, baseUrl + "/" + room);
    }

    @Override
    public void cancel(String externalId) {
        // Jitsi rooms exist only while someone is in them: nothing to delete.
    }
}
