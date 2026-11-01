package lumina.tech.labs.app.dto.admin;

import lumina.tech.labs.app.enums.SlotStatus;

import java.time.Instant;
import java.util.UUID;

public record AdminSlotResponse(
        UUID id,
        UUID technicianId,
        String technicianName,
        Instant startTime,
        Instant endTime,
        SlotStatus status,
        Booking booking
) {
    /** Who booked the slot (null while AVAILABLE). */
    public record Booking(UUID scheduleId, UUID leadId, String leadName, String companyName) {
    }
}
