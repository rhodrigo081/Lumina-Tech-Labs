package lumina.tech.labs.app.exception;

public class DuplicateLeadException extends RuntimeException {
    public DuplicateLeadException(String corporateEmail) {
        super("A lead already exists for email: " + corporateEmail);
    }
}
