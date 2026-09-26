package lumina.tech.labs.app.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Set;

/**
 * Blocklist kept intentionally small and explicit here; in production this
 * should be externalized to configuration (application.yml) so marketing/
 * sales can extend it without a redeploy.
 */
public class CorporateEmailValidator implements ConstraintValidator<CorporateEmail, String> {

    private static final Set<String> BLOCKED_DOMAINS = Set.of(
            "gmail.com", "hotmail.com", "outlook.com", "yahoo.com",
            "icloud.com", "live.com", "aol.com", "protonmail.com"
    );

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        if (email == null || !email.contains("@")) {
            return true; // let @Email / @NotBlank report the format error
        }
        String domain = email.substring(email.indexOf('@') + 1).toLowerCase().trim();
        return !BLOCKED_DOMAINS.contains(domain);
    }
}