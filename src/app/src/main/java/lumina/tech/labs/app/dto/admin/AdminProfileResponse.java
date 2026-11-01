package lumina.tech.labs.app.dto.admin;

import java.util.UUID;

public record AdminProfileResponse(UUID id, String name, String email) {
}
