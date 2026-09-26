package lumina.tech.labs.app.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;

/**
 * RNF2.1 — the client only sends the term version and the explicit
 * checkbox acceptance. `sourceIp` is intentionally NOT part of this
 * DTO: it must be read server-side from the request
 * (HttpServletRequest / X-Forwarded-For), never trusted from the
 * client body, otherwise the LGPD audit trail could be spoofed.
 */
public record ConsentRequest(

        @NotBlank(message = "termVersion is required")
        String termVersion,

        @AssertTrue(message = "the visitor must explicitly accept the terms of use and privacy policy")
        boolean accepted
) {
}