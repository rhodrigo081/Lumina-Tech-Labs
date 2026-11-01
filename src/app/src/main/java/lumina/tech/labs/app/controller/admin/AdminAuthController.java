package lumina.tech.labs.app.controller.admin;

import jakarta.validation.Valid;
import lumina.tech.labs.app.dto.admin.AdminLoginRequest;
import lumina.tech.labs.app.dto.admin.AdminProfileResponse;
import lumina.tech.labs.app.dto.admin.AdminTokenResponse;
import lumina.tech.labs.app.service.admin.AdminAuthService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/auth")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    public AdminAuthController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    /** Public (see SecurityConfig). Returns a Bearer token for the other /api/v1/admin endpoints. */
    @PostMapping("/login")
    public AdminTokenResponse login(@Valid @RequestBody AdminLoginRequest request) {
        return adminAuthService.login(request);
    }

    /** Validates the token AND that the admin still exists/is active. */
    @GetMapping("/me")
    public AdminProfileResponse me(@AuthenticationPrincipal Jwt jwt) {
        return adminAuthService.profile(UUID.fromString(jwt.getSubject()));
    }
}
