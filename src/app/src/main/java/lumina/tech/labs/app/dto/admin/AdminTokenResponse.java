package lumina.tech.labs.app.dto.admin;

import java.time.Instant;

public record AdminTokenResponse(String accessToken, String tokenType, Instant expiresAt, AdminProfileResponse admin) {
}
