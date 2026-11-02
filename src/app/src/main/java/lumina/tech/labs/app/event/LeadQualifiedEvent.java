package lumina.tech.labs.app.event;

import lumina.tech.labs.app.enums.Priority;

import java.util.UUID;

public record LeadQualifiedEvent(UUID leadId, Priority priority) {
}
