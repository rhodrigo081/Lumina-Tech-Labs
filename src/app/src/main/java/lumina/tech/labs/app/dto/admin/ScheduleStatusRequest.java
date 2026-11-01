package lumina.tech.labs.app.dto.admin;

import jakarta.validation.constraints.NotNull;
import lumina.tech.labs.app.enums.ScheduleStatus;

public record ScheduleStatusRequest(@NotNull(message = "status is required") ScheduleStatus status) {
}
