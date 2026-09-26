package lumina.tech.labs.app.dto.request;

import lumina.tech.labs.app.validation.CorporateEmail;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Body of POST /api/v1/leads (FR01.3, FR03.1).
 * Combined with the Idempotency-Key HTTP header (not part of the body)
 * to make repeated submissions safe.
 */
public record LeadCaptureRequest(

        @NotBlank(message = "fullName is required")
        String fullName,

        @NotBlank(message = "corporateEmail is required")
        @Email(message = "corporateEmail must be a valid email address")
        @CorporateEmail
        String corporateEmail,

        @NotBlank(message = "phone is required")
        @Pattern(regexp = "^[0-9+()\\-\\s]{8,20}$", message = "phone must be a valid phone/WhatsApp number")
        String phone,

        @NotBlank(message = "jobTitle is required")
        String jobTitle,

        @NotBlank(message = "companyName is required")
        String companyName,

        @NotNull(message = "diagnostic data is required")
        @Valid
        DiagnosticInputRequest diagnostic,

        @NotNull(message = "consent is required")
        @Valid
        ConsentRequest consent
) {
}