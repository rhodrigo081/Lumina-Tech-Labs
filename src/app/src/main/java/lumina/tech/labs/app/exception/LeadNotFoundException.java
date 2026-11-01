package lumina.tech.labs.app.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class LeadNotFoundException extends ApiException {
    public LeadNotFoundException(UUID leadId) {
        super(HttpStatus.NOT_FOUND, "LEAD_NOT_FOUND", "Lead not found: " + leadId);
    }
}
