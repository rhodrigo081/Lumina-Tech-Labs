package lumina.tech.labs.app.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TechnicianRequest(
        @NotBlank(message = "name is required")
        @Size(max = 150, message = "name must have at most 150 characters")
        String name,

        @NotBlank(message = "email is required")
        @Email(message = "email must be valid")
        @Size(max = 255, message = "email must have at most 255 characters")
        String email,

        @Size(max = 150, message = "specialty must have at most 150 characters")
        String specialty,

        Boolean active
) {
}
