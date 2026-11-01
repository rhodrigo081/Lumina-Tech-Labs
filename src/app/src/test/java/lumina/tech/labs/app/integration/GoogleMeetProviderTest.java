package lumina.tech.labs.app.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GoogleMeetProviderTest {

    private static final String EVENTS = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

    MockRestServiceServer server;
    GoogleMeetProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new GoogleMeetProvider(builder, "client", "secret", "refresh", "primary", "America/Sao_Paulo");
    }

    private void expectToken() {
        server.expect(once(), requestTo("https://oauth2.googleapis.com/token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().formDataContains(Map.of("grant_type", "refresh_token", "refresh_token", "refresh")))
                .andRespond(withSuccess("{\"access_token\":\"tok\",\"expires_in\":3599}", MediaType.APPLICATION_JSON));
    }

    @Test
    void createsACalendarEventWithMeetAndInvitesEveryone() {
        expectToken();
        server.expect(once(), requestTo(EVENTS + "?conferenceDataVersion=1&sendUpdates=all"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer tok"))
                .andExpect(jsonPath("$.start.dateTime").value("2026-11-03T13:00:00Z"))
                .andExpect(jsonPath("$.attendees[0].email").value("cliente@gmail.com"))
                .andExpect(jsonPath("$.attendees[1].email").value("tecnico@lumina.com"))
                .andExpect(jsonPath("$.conferenceData.createRequest.conferenceSolutionKey.type").value("hangoutsMeet"))
                .andRespond(withSuccess("{\"id\":\"evt1\",\"hangoutLink\":\"https://meet.google.com/abc-defg-hij\"}",
                        MediaType.APPLICATION_JSON));

        MeetingProvider.Meeting meeting = provider.create(request());

        assertThat(meeting.externalId()).isEqualTo("evt1");
        assertThat(meeting.joinUrl()).isEqualTo("https://meet.google.com/abc-defg-hij");
        server.verify();
    }

    @Test
    void fetchesTheEventAgainWhenTheConferenceIsStillPending() {
        expectToken();
        server.expect(once(), requestTo(EVENTS + "?conferenceDataVersion=1&sendUpdates=all"))
                .andRespond(withSuccess("{\"id\":\"evt2\",\"conferenceData\":{\"createRequest\":{\"status\":{\"statusCode\":\"pending\"}}}}",
                        MediaType.APPLICATION_JSON));
        server.expect(once(), requestTo(EVENTS + "/evt2"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{\"id\":\"evt2\",\"conferenceData\":{\"entryPoints\":[{\"entryPointType\":\"phone\",\"uri\":\"tel:+1\"},"
                        + "{\"entryPointType\":\"video\",\"uri\":\"https://meet.google.com/xyz-abcd-efg\"}]}}", MediaType.APPLICATION_JSON));

        assertThat(provider.create(request()).joinUrl()).isEqualTo("https://meet.google.com/xyz-abcd-efg");
        server.verify();
    }

    @Test
    void cancelDeletesTheEventAndIgnoresOnesAlreadyGone() {
        expectToken();
        server.expect(once(), requestTo(EVENTS + "/evt1?sendUpdates=all"))
                .andExpect(method(HttpMethod.DELETE))
                .andRespond(withStatus(HttpStatus.GONE));

        provider.cancel("evt1");
        server.verify();
    }

    @Test
    void explainsATokenFromAnotherOAuthClient() {
        server.expect(once(), requestTo("https://oauth2.googleapis.com/token"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"unauthorized_client\",\"error_description\":\"Unauthorized\"}"));

        assertThatThrownBy(() -> provider.create(request())).hasMessageContaining("different OAuth client");
    }

    private static MeetingProvider.MeetingRequest request() {
        return new MeetingProvider.MeetingRequest("Diagnóstico", "desc",
                Instant.parse("2026-11-03T13:00:00Z"), Instant.parse("2026-11-03T13:45:00Z"),
                List.of("cliente@gmail.com", "tecnico@lumina.com"));
    }
}
