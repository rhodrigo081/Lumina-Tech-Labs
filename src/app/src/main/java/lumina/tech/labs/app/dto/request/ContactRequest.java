package lumina.tech.labs.app.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ContactRequest(
        @NotBlank(message = "name is required")
        @Size(min = 3, max = 255, message = "name must have between 3 and 255 characters")
        String name,

        @NotBlank(message = "email is required")
        @Size(max = 255, message = "email must have at most 255 characters")
        @Email(message = "email must be a valid email address")
        String email,

        @NotBlank(message = "phone is required")
        @Pattern(regexp = "^[0-9+()\\-\\s]{8,20}$", message = "phone must be a valid phone/WhatsApp number")
        String phone,

        @Size(max = 255, message = "company must have at most 255 characters")
        String company,

        @NotBlank(message = "subject is required")
        @Size(max = 120, message = "subject must have at most 120 characters")
        @Pattern(regexp = "^[^\\r\\n]*$", message = "subject must be a single line")
        String subject,

        @NotBlank(message = "message is required")
        @Size(min = 10, max = 1000, message = "message must have between 10 and 1000 characters")
        String message
) {
}
