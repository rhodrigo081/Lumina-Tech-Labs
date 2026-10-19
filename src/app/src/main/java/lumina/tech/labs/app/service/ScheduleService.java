package lumina.tech.labs.app.service;

import lumina.tech.labs.app.dto.request.ScheduleBookingRequest;
import lumina.tech.labs.app.dto.response.ScheduleResponse;
import lumina.tech.labs.app.dto.response.ScheduleSlotResponse;
import lumina.tech.labs.app.mapper.LeadMapper;
import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.model.Schedule;
import lumina.tech.labs.app.enums.ScheduleStatus;
import lumina.tech.labs.app.event.ScheduleBookedEvent;
import lumina.tech.labs.app.exception.ScheduleConflictException;
import lumina.tech.labs.app.integration.CalendarClient;
import lumina.tech.labs.app.integration.VideoRoomClient;
import lumina.tech.labs.app.repository.ScheduleRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Implements FR02.1-02.3. `getAvailableSlots` reads from a short-TTL Redis
 * cache before hitting the external calendar (design doc, section 5). The
 * booking itself is protected on two levels: an application-level check
 * against ScheduleRepository, then the calendar provider's own event
 * creation acting as the final authority (its own conflict rules apply).
 */
@Service
public class ScheduleService {

    private static final Duration SLOTS_CACHE_TTL = Duration.ofMinutes(2);

    private final ScheduleRepository scheduleRepository;
    private final CalendarClient calendarClient;
    private final VideoRoomClient videoRoomClient;
    private final LeadService leadService;
    private final LeadMapper leadMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisTemplate<String, Object> redisTemplate;

    public ScheduleService(ScheduleRepository scheduleRepository,
                            CalendarClient calendarClient,
                            VideoRoomClient videoRoomClient,
                            LeadService leadService,
                            LeadMapper leadMapper,
                            ApplicationEventPublisher eventPublisher,
                            RedisTemplate<String, Object> redisTemplate) {
        this.scheduleRepository = scheduleRepository;
        this.calendarClient = calendarClient;
        this.videoRoomClient = videoRoomClient;
        this.leadService = leadService;
        this.leadMapper = leadMapper;
        this.eventPublisher = eventPublisher;
        this.redisTemplate = redisTemplate;
    }

    @SuppressWarnings("unchecked")
    public List<ScheduleSlotResponse> getAvailableSlots(String consultantId) {
        String cacheKey = "schedule:slots:" + consultantId;
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached instanceof List<?> cachedList) {
            return (List<ScheduleSlotResponse>) cachedList;
        }

        LocalDateTime from = LocalDateTime.now();
        LocalDateTime to = from.plusDays(7);
        List<ScheduleSlotResponse> slots = calendarClient.fetchAvailability(consultantId, from, to).stream()
                .map(slot -> new ScheduleSlotResponse(consultantId, consultantId, slot.start(), slot.end()))
                .toList();

        redisTemplate.opsForValue().set(cacheKey, slots, SLOTS_CACHE_TTL);
        return slots;
    }

    @Transactional
    public ScheduleResponse book(ScheduleBookingRequest request) {
        Lead lead = leadService.getLeadOrThrow(request.leadId());

        boolean conflict = scheduleRepository.existsBySdrAssignedAndMeetingTimeAndStatusNot(
                request.consultantId(), request.startTime(), ScheduleStatus.CANCELLED);
        if (conflict) {
            throw new ScheduleConflictException(request.consultantId(), request.startTime());
        }

        // Calendar provider is the final source of truth for the lock — its own
        // API call fails/throws if a concurrent booking won the race.
        calendarClient.createEvent(request.consultantId(), request.startTime(),
                request.startTime().plusMinutes(45), lead.getCorporateEmail());
        String videoLink = videoRoomClient.createRoom("Diagnostic meeting with " + lead.getFullName());

        Schedule schedule = Schedule.builder()
                .sdrAssigned(request.consultantId())
                .meetingTime(request.startTime())
                .videoLink(videoLink)
                .status(ScheduleStatus.SCHEDULED)
                .build();
        lead.assignSchedule(schedule); // sets both sides — Lead (0..1) <-> Schedule (1)

        Schedule saved = scheduleRepository.save(schedule);

        // Clear the slot cache for this consultant so the booked slot disappears immediately.
        redisTemplate.delete("schedule:slots:" + request.consultantId());

        eventPublisher.publishEvent(new ScheduleBookedEvent(saved.getId(), lead.getId()));

        return leadMapper.toResponse(saved);
    }
}
