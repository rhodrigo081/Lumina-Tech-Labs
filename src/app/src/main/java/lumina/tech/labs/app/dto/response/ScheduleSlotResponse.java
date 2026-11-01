package lumina.tech.labs.app.dto.response;

import java.time.Instant;
import java.util.UUID;

/** A single bookable slot returned by GET /api/v1/schedule/slots (FR02.1). Times are UTC instants (ISO-8601 with 'Z'). */
public record ScheduleSlotResponse(
        UUID id,
        UUID technicianId,
        String technicianName,
        String technicianSpecialty,
        Instant startTime,
        Instant endTime
) {
}
