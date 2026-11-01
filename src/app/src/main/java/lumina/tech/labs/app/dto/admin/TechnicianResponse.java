package lumina.tech.labs.app.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record TechnicianResponse(UUID id, String name, String email, String specialty, boolean active, Instant createdAt) {
}
