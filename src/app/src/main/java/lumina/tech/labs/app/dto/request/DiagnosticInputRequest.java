package lumina.tech.labs.app.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Nested payload for RF01.1 — raw inputs the visitor provides about
 * their corporate space. Used both by the preview endpoint and as
 * part of the full lead capture payload.
 */
public record DiagnosticInputRequest(

        @NotNull(message = "areaM2 is required")
        @DecimalMin(value = "1.0", message = "areaM2 must be greater than zero")
        BigDecimal areaM2,

        @NotNull(message = "workstations is required")
        @Min(value = 1, message = "workstations must be at least 1")
        Integer workstations,

        @NotNull(message = "monthlyEnergyBill is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "monthlyEnergyBill must be greater than zero")
        BigDecimal monthlyEnergyBill,

        @NotBlank(message = "currentInfrastructure is required")
        String currentInfrastructure
) {
}