package lumina.tech.labs.app.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Body of POST /api/v1/leads (FR01.3, FR03.1).
 * Combined with the Idempotency-Key HTTP header (not part of the body)
 * to make repeated submissions safe.
 *
 * Every @Size mirrors the column length in V1__init.sql, so oversized input
 * is rejected with a 400 instead of failing the INSERT with a 500.
 */
public record LeadCaptureRequest(
        @NotBlank(message = "fullName is required")
        @Size(max = 255, message = "fullName must have at most 255 characters")
        String fullName,

        @NotBlank(message = "corporateEmail is required")
        @Size(max = 255, message = "corporateEmail must have at most 255 characters")
        @Email(message = "corporateEmail must be a valid email address")
        String corporateEmail,

        @NotBlank(message = "phone is required")
        @Pattern(regexp = "^[0-9+()\\-\\s]{8,20}$", message = "phone must be a valid phone/WhatsApp number")
        String phone,

        @NotBlank(message = "jobTitle is required")
        @Size(max = 150, message = "jobTitle must have at most 150 characters")
        String jobTitle,

        @NotBlank(message = "companyName is required")
        @Size(max = 255, message = "companyName must have at most 255 characters")
        String companyName,

        @NotNull(message = "diagnostic data is required")
        @Valid
        DiagnosticInputRequest diagnostic,

        @NotNull(message = "consent is required")
        @Valid
        ConsentRequest consent
) {
}
