package lumina.tech.labs.app.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Creates a Google Calendar event with a Google Meet conference on the calendar of
 * the account that authorized the app (OAuth refresh token). Google itself emails
 * the invitation to every attendee (lead + technician) and removes it on cancel.
 *
 * Required: lumina.meeting.google.client-id / client-secret / refresh-token
 * (scope https://www.googleapis.com/auth/calendar.events).
 */
@Component
@ConditionalOnProperty(name = "lumina.meeting.provider", havingValue = "google")
public class GoogleMeetProvider implements MeetingProvider {

    private static final Logger log = LoggerFactory.getLogger(GoogleMeetProvider.class);
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/%s/events";

    private final RestClient http;
    private final String clientId;
    private final String clientSecret;
    private final String refreshToken;
    private final String eventsUrl;
    private final String timeZone;

    private String accessToken;
    private Instant accessTokenExpiresAt = Instant.EPOCH;

    @Autowired
    public GoogleMeetProvider(@Value("${lumina.meeting.google.client-id:}") String clientId,
                              @Value("${lumina.meeting.google.client-secret:}") String clientSecret,
                              @Value("${lumina.meeting.google.refresh-token:}") String refreshToken,
                              @Value("${lumina.meeting.google.calendar-id:primary}") String calendarId,
                              @Value("${lumina.scheduling.zone:America/Sao_Paulo}") String timeZone) {
        this(RestClient.builder().requestFactory(timeouts()), clientId, clientSecret, refreshToken, calendarId, timeZone);
    }

    GoogleMeetProvider(RestClient.Builder http, String clientId, String clientSecret, String refreshToken,
                       String calendarId, String timeZone) {
        if (clientId.isBlank() || clientSecret.isBlank() || refreshToken.isBlank()) {
            throw new IllegalStateException("lumina.meeting.provider=google requires GOOGLE_CLIENT_ID, "
                    + "GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN");
        }
        this.http = http.build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.refreshToken = refreshToken;
        this.eventsUrl = EVENTS_URL.formatted(URLEncoder.encode(calendarId, StandardCharsets.UTF_8));
        this.timeZone = timeZone;
    }

    private static SimpleClientHttpRequestFactory timeouts() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        return requestFactory;
    }

    @Override
    public Meeting create(MeetingRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("summary", request.title());
        body.put("description", request.description());
        body.put("start", Map.of("dateTime", request.start().toString(), "timeZone", timeZone));
        body.put("end", Map.of("dateTime", request.end().toString(), "timeZone", timeZone));
        body.put("attendees", request.attendeeEmails().stream().map(e -> Map.of("email", e)).toList());
        body.put("conferenceData", Map.of("createRequest", Map.of(
                "requestId", UUID.randomUUID().toString(),
                "conferenceSolutionKey", Map.of("type", "hangoutsMeet"))));
        body.put("reminders", Map.of("useDefault", true));

        Map<?, ?> event = http.post()
                .uri(eventsUrl + "?conferenceDataVersion=1&sendUpdates=all")
                .headers(h -> h.setBearerAuth(token()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);
        if (event == null || event.get("id") == null) {
            throw new IllegalStateException("Google Calendar returned no event");
        }
        String eventId = event.get("id").toString();
        String link = joinUrl(event);
        if (link == null) {
            // Meet creation is normally synchronous, but the API allows it to be "pending".
            Map<?, ?> again = http.get()
                    .uri(eventsUrl + "/" + eventId)
                    .headers(h -> h.setBearerAuth(token()))
                    .retrieve()
                    .body(Map.class);
            link = again != null ? joinUrl(again) : null;
        }
        if (link == null) {
            log.warn("Google event {} was created without a Meet link", eventId);
        }
        return new Meeting(eventId, link);
    }

    @Override
    public void cancel(String externalId) {
        try {
            http.delete()
                    .uri(eventsUrl + "/" + URLEncoder.encode(externalId, StandardCharsets.UTF_8) + "?sendUpdates=all")
                    .headers(h -> h.setBearerAuth(token()))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException ex) {
            if (ex.getStatusCode() != HttpStatus.NOT_FOUND && ex.getStatusCode() != HttpStatus.GONE) {
                throw ex;
            }
            // Already deleted on the calendar: nothing left to do.
        }
    }

    private static String joinUrl(Map<?, ?> event) {
        Object hangout = event.get("hangoutLink");
        if (hangout != null) {
            return hangout.toString();
        }
        if (event.get("conferenceData") instanceof Map<?, ?> conference
                && conference.get("entryPoints") instanceof List<?> entryPoints) {
            for (Object entry : entryPoints) {
                if (entry instanceof Map<?, ?> e && "video".equals(e.get("entryPointType")) && e.get("uri") != null) {
                    return e.get("uri").toString();
                }
            }
        }
        return null;
    }

    /** Access tokens last ~1h; refreshed a minute early. */
    private synchronized String token() {
        if (accessToken != null && Instant.now().isBefore(accessTokenExpiresAt.minusSeconds(60))) {
            return accessToken;
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("refresh_token", refreshToken);
        form.add("grant_type", "refresh_token");
        Map<?, ?> response;
        try {
            response = http.post()
                    .uri(TOKEN_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
        } catch (HttpClientErrorException ex) {
            String body = ex.getResponseBodyAsString();
            String hint = body.contains("unauthorized_client")
                    ? "the refresh token was issued for a different OAuth client than GOOGLE_CLIENT_ID/SECRET"
                    : body.contains("invalid_grant")
                    ? "GOOGLE_REFRESH_TOKEN is invalid, revoked or expired (7-day limit while the consent screen is in Testing)"
                    : body.contains("invalid_client") ? "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is wrong" : "see response";
            throw new IllegalStateException("Google OAuth rejected the credentials: " + hint + " — " + body.replaceAll("\\s+", " "), ex);
        }
        if (response == null || response.get("access_token") == null) {
            throw new IllegalStateException("Google OAuth returned no access token");
        }
        accessToken = response.get("access_token").toString();
        long expiresIn = response.get("expires_in") instanceof Number n ? n.longValue() : 3600;
        accessTokenExpiresAt = Instant.now().plusSeconds(expiresIn);
        return accessToken;
    }
}
