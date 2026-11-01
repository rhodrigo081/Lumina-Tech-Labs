package lumina.tech.labs.app.exception;

import org.springframework.http.HttpStatus;

public class DuplicateLeadException extends ApiException {
    public DuplicateLeadException(String corporateEmail) {
        super(HttpStatus.CONFLICT, "DUPLICATE_LEAD", "A lead already exists for email: " + corporateEmail);
    }
}
