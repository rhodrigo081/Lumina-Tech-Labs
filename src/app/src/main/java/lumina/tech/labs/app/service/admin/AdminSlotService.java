package lumina.tech.labs.app.service.admin;

import lumina.tech.labs.app.dto.admin.AdminSlotBatchRequest;
import lumina.tech.labs.app.dto.admin.AdminSlotBatchResponse;
import lumina.tech.labs.app.dto.admin.AdminSlotResponse;
import lumina.tech.labs.app.enums.ScheduleStatus;
import lumina.tech.labs.app.enums.SlotStatus;
import lumina.tech.labs.app.exception.ApiException;
import lumina.tech.labs.app.model.AvailabilitySlot;
import lumina.tech.labs.app.model.Schedule;
import lumina.tech.labs.app.model.Technician;
import lumina.tech.labs.app.repository.AvailabilitySlotRepository;
import lumina.tech.labs.app.repository.ScheduleRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Admin management of the availability slots leads can book. */
@Service
public class AdminSlotService {

    private static final int MAX_SLOTS_PER_REQUEST = 500;
    private static final Duration MAX_LIST_RANGE = Duration.ofDays(62);

    private final AvailabilitySlotRepository slotRepository;
    private final ScheduleRepository scheduleRepository;
    private final TechnicianService technicianService;
    private final ZoneId zone;

    public AdminSlotService(AvailabilitySlotRepository slotRepository,
                            ScheduleRepository scheduleRepository,
                            TechnicianService technicianService,
                            @Value("${lumina.scheduling.zone:America/Sao_Paulo}") ZoneId zone) {
        this.slotRepository = slotRepository;
        this.scheduleRepository = scheduleRepository;
        this.technicianService = technicianService;
        this.zone = zone;
    }

    @Transactional(readOnly = true)
    public List<AdminSlotResponse> list(Instant from, Instant to, UUID technicianId) {
        if (!to.isAfter(from)) {
            throw ApiException.badRequest("INVALID_RANGE", "`to` must be after `from`");
        }
        if (Duration.between(from, to).compareTo(MAX_LIST_RANGE) > 0) {
            throw ApiException.badRequest("INVALID_RANGE", "The range must be at most 62 days");
        }
        List<AvailabilitySlot> slots = technicianId == null
                ? slotRepository.findInRange(from, to)
                : slotRepository.findInRangeForTechnician(from, to, technicianId);
        return withBookings(slots);
    }

    @Transactional
    public AdminSlotBatchResponse createBatch(AdminSlotBatchRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw ApiException.badRequest("INVALID_RANGE", "endTime must be after startTime");
        }
        Technician technician = technicianService.getOrThrow(request.technicianId());
        if (!technician.isActive()) {
            throw ApiException.conflict("TECHNICIAN_INACTIVE", "Activate the technician before creating slots");
        }

        Duration duration = Duration.ofMinutes(request.durationMinutes());
        Duration step = duration.plusMinutes(request.breakMinutes() == null ? 0 : request.breakMinutes());
        Instant now = Instant.now();

        List<AvailabilitySlot> toCreate = new ArrayList<>();
        int skipped = 0;
        for (LocalDate date : new TreeSet<>(request.dates())) {
            ZonedDateTime windowStart = date.atTime(request.startTime()).atZone(zone);
            ZonedDateTime windowEnd = date.atTime(request.endTime()).atZone(zone);
            List<AvailabilitySlot> existing = slotRepository.findOverlapping(technician.getId(),
                    windowStart.toInstant(), windowEnd.toInstant());

            for (ZonedDateTime cursor = windowStart; !cursor.plus(duration).isAfter(windowEnd); cursor = cursor.plus(step)) {
                Instant start = cursor.toInstant();
                Instant end = cursor.plus(duration).toInstant();
                boolean overlaps = existing.stream().anyMatch(s -> s.getStartTime().isBefore(end) && s.getEndTime().isAfter(start));
                if (!start.isAfter(now) || overlaps) {
                    skipped++;
                    continue;
                }
                toCreate.add(AvailabilitySlot.builder()
                        .technician(technician)
                        .startTime(start)
                        .endTime(end)
                        .status(SlotStatus.AVAILABLE)
                        .build());
                if (toCreate.size() > MAX_SLOTS_PER_REQUEST) {
                    throw ApiException.badRequest("TOO_MANY_SLOTS",
                            "At most " + MAX_SLOTS_PER_REQUEST + " slots can be created per request");
                }
            }
        }

        List<AvailabilitySlot> saved = slotRepository.saveAllAndFlush(toCreate);
        return new AdminSlotBatchResponse(saved.stream().map(s -> toResponse(s, null)).toList(), skipped);
    }

    @Transactional
    public void delete(UUID slotId) {
        if (slotRepository.deleteIfOpen(slotId, SlotStatus.AVAILABLE) == 0) {
            if (!slotRepository.existsById(slotId)) {
                throw ApiException.notFound("SLOT_NOT_FOUND", "Slot not found: " + slotId);
            }
            throw ApiException.conflict("SLOT_BOOKED", "This slot is booked. Cancel the meeting before removing it.");
        }
    }

    private List<AdminSlotResponse> withBookings(List<AvailabilitySlot> slots) {
        List<UUID> bookedIds = slots.stream().filter(s -> s.getStatus() == SlotStatus.BOOKED).map(AvailabilitySlot::getId).toList();
        Map<UUID, Schedule> bySlot = bookedIds.isEmpty() ? Map.of()
                : scheduleRepository.findBySlotIdInAndStatusNot(bookedIds, ScheduleStatus.CANCELLED).stream()
                .collect(Collectors.toMap(s -> s.getSlot().getId(), Function.identity(), (a, b) -> a));
        return slots.stream().map(s -> toResponse(s, bySlot.get(s.getId()))).toList();
    }

    private static AdminSlotResponse toResponse(AvailabilitySlot slot, Schedule schedule) {
        AdminSlotResponse.Booking booking = schedule == null ? null : new AdminSlotResponse.Booking(
                schedule.getId(), schedule.getLead().getId(), schedule.getLead().getFullName(),
                schedule.getLead().getCompany().getName());
        return new AdminSlotResponse(slot.getId(), slot.getTechnician().getId(), slot.getTechnician().getName(),
                slot.getStartTime(), slot.getEndTime(), slot.getStatus(), booking);
    }
}
