package lumina.tech.labs.app.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lumina.tech.labs.app.engine.InfrastructureProfile;

import java.math.BigDecimal;

public record DiagnosticInputRequest(
        @NotNull(message = "areaM2 is required")
        @DecimalMin(value = "200", message = "areaM2 must be at least 200 m²")
        @DecimalMax(value = "1000000", message = "areaM2 must be at most 1,000,000 m²")
        BigDecimal areaM2,

        @NotNull(message = "workstations is required")
        @Min(value = 1, message = "workstations must be at least 1")
        @Max(value = 10000, message = "workstations must be at most 10,000")
        Integer workstations,

        @NotNull(message = "monthlyEnergyBill is required")
        @DecimalMin(value = "1.00", message = "monthlyEnergyBill must be at least 1.00")
        @DecimalMax(value = "10000000", message = "monthlyEnergyBill must be at most 10,000,000")
        BigDecimal monthlyEnergyBill,

        @NotBlank(message = "currentInfrastructure is required")
        @Size(max = 255, message = "currentInfrastructure must have at most 255 characters")
        @Pattern(regexp = InfrastructureProfile.CODES, message = "currentInfrastructure must be one of the listed options")
        String currentInfrastructure
) {
}
