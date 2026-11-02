package lumina.tech.labs.app.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ScheduleSlotResponse(
        UUID id,
        UUID technicianId,
        String technicianName,
        String technicianSpecialty,
        Instant startTime,
        Instant endTime
) {
}
