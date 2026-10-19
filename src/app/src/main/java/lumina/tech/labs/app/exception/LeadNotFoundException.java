package lumina.tech.labs.app.exception;

import java.util.UUID;

public class LeadNotFoundException extends RuntimeException {
    public LeadNotFoundException(UUID leadId) {
        super("Lead not found: " + leadId);
    }
}
