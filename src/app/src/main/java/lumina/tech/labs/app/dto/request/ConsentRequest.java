package lumina.tech.labs.app.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConsentRequest(

        @NotBlank(message = "termVersion is required")
        @Size(max = 50, message = "termVersion must have at most 50 characters")
        String termVersion,

        @AssertTrue(message = "the visitor must explicitly accept the terms of use and privacy policy")
        boolean accepted
) {
}
