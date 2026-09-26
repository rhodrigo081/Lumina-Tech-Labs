package lumina.tech.labs.app.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Enforces FR01.3: the email must belong to a business domain.
 * Generic providers (gmail.com, hotmail.com, etc.) are rejected.
 * Combine with @Email for basic format validation:
 *
 *   @NotBlank @Email @CorporateEmail
 *   private String corporateEmail;
 */
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = CorporateEmailValidator.class)
@Documented
public @interface CorporateEmail {

    String message() default "email must be a corporate address (generic providers are not allowed)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}