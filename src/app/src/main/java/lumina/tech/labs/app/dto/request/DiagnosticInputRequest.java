package lumina.tech.labs.app.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Nested payload for RF01.1 — raw inputs the visitor provides about
 * their corporate space. Used both by the preview endpoint and as
 * part of the full lead capture payload.
 *
 * Upper bounds keep every derived value inside its NUMERIC column
 * (worst case payback = 100 000 * 350 / (1.00 * 0.28) ≈ 1.25e8 < NUMERIC(12,2)).
 */
public record DiagnosticInputRequest(
        @NotNull(message = "areaM2 is required")
        @DecimalMin(value = "1.0", message = "areaM2 must be greater than zero")
        @DecimalMax(value = "1000000", message = "areaM2 must be at most 1,000,000 m²")
        BigDecimal areaM2,

        @NotNull(message = "workstations is required")
        @Min(value = 1, message = "workstations must be at least 1")
        @Max(value = 100000, message = "workstations must be at most 100,000")
        Integer workstations,

        @NotNull(message = "monthlyEnergyBill is required")
        @DecimalMin(value = "1.00", message = "monthlyEnergyBill must be at least 1.00")
        @DecimalMax(value = "10000000", message = "monthlyEnergyBill must be at most 10,000,000")
        BigDecimal monthlyEnergyBill,

        @NotBlank(message = "currentInfrastructure is required")
        @Size(max = 255, message = "currentInfrastructure must have at most 255 characters")
        String currentInfrastructure
) {
}
