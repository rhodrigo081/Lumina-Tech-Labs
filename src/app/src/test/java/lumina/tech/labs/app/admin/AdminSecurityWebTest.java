package lumina.tech.labs.app.admin;

import lumina.tech.labs.app.config.CorsConfig;
import lumina.tech.labs.app.config.SecurityConfig;
import lumina.tech.labs.app.controller.ScheduleController;
import lumina.tech.labs.app.controller.admin.AdminAuthController;
import lumina.tech.labs.app.controller.admin.AdminLeadController;
import lumina.tech.labs.app.controller.admin.AdminScheduleController;
import lumina.tech.labs.app.dto.admin.AdminDashboardResponse;
import lumina.tech.labs.app.dto.admin.AdminProfileResponse;
import lumina.tech.labs.app.dto.admin.AdminTokenResponse;
import lumina.tech.labs.app.exception.ApiException;
import lumina.tech.labs.app.service.ScheduleService;
import lumina.tech.labs.app.service.admin.AdminAuthService;
import lumina.tech.labs.app.service.admin.AdminLeadService;
import lumina.tech.labs.app.service.admin.AdminSlotService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AdminAuthController.class, AdminLeadController.class, AdminScheduleController.class,
        ScheduleController.class})
@Import({SecurityConfig.class, CorsConfig.class})
@TestPropertySource(properties = {
        "lumina.security.jwt.secret=test-secret-with-at-least-32-bytes-for-hs256!",
        "lumina.cors.allowed-origins=http://localhost:4200"
})
class AdminSecurityWebTest {

    @Autowired MockMvc mvc;
    @Autowired JwtEncoder jwtEncoder;

    @MockitoBean AdminAuthService adminAuthService;
    @MockitoBean AdminLeadService adminLeadService;
    @MockitoBean AdminSlotService adminSlotService;
    @MockitoBean ScheduleService scheduleService;

    @Test
    void adminEndpointsRequireAToken() throws Exception {
        mvc.perform(get("/api/v1/admin/dashboard"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void validAdminTokenIsAccepted() throws Exception {
        given(adminLeadService.dashboard()).willReturn(new AdminDashboardResponse(10, 3, 4, 2, 7, 2));

        mvc.perform(get("/api/v1/admin/dashboard").header("Authorization", "Bearer " + token(List.of("ADMIN"), SecurityConfig.ISSUER, Duration.ofHours(1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalLeads").value(10))
                .andExpect(jsonPath("$.openSlots").value(7));
    }

    @Test
    void tokenWithoutAdminRoleIsForbidden() throws Exception {
        mvc.perform(get("/api/v1/admin/dashboard").header("Authorization", "Bearer " + token(List.of("USER"), SecurityConfig.ISSUER, Duration.ofHours(1))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void expiredOrForeignTokensAreRejected() throws Exception {
        mvc.perform(get("/api/v1/admin/dashboard").header("Authorization", "Bearer " + token(List.of("ADMIN"), SecurityConfig.ISSUER, Duration.ofHours(-2))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/dashboard").header("Authorization", "Bearer " + token(List.of("ADMIN"), "someone-else", Duration.ofHours(1))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/dashboard").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginIsPublicAndReturnsTheToken() throws Exception {
        given(adminAuthService.login(any())).willReturn(new AdminTokenResponse("abc.def.ghi", "Bearer",
                Instant.parse("2030-01-01T00:00:00Z"), new AdminProfileResponse(UUID.randomUUID(), "Admin", "admin@lumina.tech")));

        mvc.perform(post("/api/v1/admin/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@lumina.tech\",\"password\":\"secret-password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("abc.def.ghi"))
                .andExpect(jsonPath("$.expiresAt").value("2030-01-01T00:00:00Z"));
    }

    @Test
    void wrongCredentialsAreA401WithACode() throws Exception {
        given(adminAuthService.login(any())).willThrow(
                new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password"));

        mvc.perform(post("/api/v1/admin/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@lumina.tech\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void publicFunnelStaysOpenAndMalformedInputIsA400() throws Exception {
        given(scheduleService.getAvailableSlots(any())).willReturn(List.of());

        mvc.perform(get("/api/v1/schedule/slots")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/schedule/slots").param("technicianId", "not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
        mvc.perform(post("/api/v1/schedule/book").contentType(MediaType.APPLICATION_JSON).content("{broken"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
        mvc.perform(post("/api/v1/schedule/book").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void slotBatchValidationIsReportedPerField() throws Exception {
        mvc.perform(post("/api/v1/admin/slots").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token(List.of("ADMIN"), SecurityConfig.ISSUER, Duration.ofHours(1)))
                        .content("{\"technicianId\":\"" + UUID.randomUUID() + "\",\"dates\":[],\"startTime\":\"09:00\",\"endTime\":\"12:00\",\"durationMinutes\":5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.length()").value(2));
    }

    private String token(List<String> roles, String issuer, Duration validFor) {
        Instant now = Instant.now();
        Instant issuedAt = validFor.isNegative() ? now.plus(validFor).minus(Duration.ofHours(1)) : now;
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(UUID.randomUUID().toString())
                .issuedAt(issuedAt)
                .expiresAt(now.plus(validFor))
                .claim("roles", roles)
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
