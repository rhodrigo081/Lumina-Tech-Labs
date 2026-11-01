package lumina.tech.labs.app.service;

import lumina.tech.labs.app.dto.request.ScheduleBookingRequest;
import lumina.tech.labs.app.dto.response.ScheduleResponse;
import lumina.tech.labs.app.dto.response.ScheduleSlotResponse;
import lumina.tech.labs.app.enums.ScheduleStatus;
import lumina.tech.labs.app.enums.SlotStatus;
import lumina.tech.labs.app.event.ScheduleBookedEvent;
import lumina.tech.labs.app.event.ScheduleCancelledEvent;
import lumina.tech.labs.app.exception.ApiException;
import lumina.tech.labs.app.exception.LeadNotFoundException;
import lumina.tech.labs.app.integration.MeetingProvider;
import lumina.tech.labs.app.model.AvailabilitySlot;
import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.model.Schedule;
import lumina.tech.labs.app.model.Technician;
import lumina.tech.labs.app.repository.AvailabilitySlotRepository;
import lumina.tech.labs.app.repository.LeadRepository;
import lumina.tech.labs.app.repository.ScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Implements FR02.1-02.3 on top of the availability slots that admins create.
 *
 * Double booking is prevented by {@link AvailabilitySlotRepository#claim}: a
 * single conditional UPDATE (AVAILABLE -> BOOKED) — whoever flips the row
 * first wins, every other concurrent request gets 409 SLOT_UNAVAILABLE.
 * The meeting room is created during booking so the client sees the link right
 * away; if the transaction then rolls back, the external event is removed.
 * Emails only go out after commit.
 */
@Service
public class ScheduleService {

    private static final Logger log = LoggerFactory.getLogger(ScheduleService.class);
    private static final Duration LEGACY_MEETING_LENGTH = Duration.ofMinutes(45);

    private final ScheduleRepository scheduleRepository;
    private final AvailabilitySlotRepository slotRepository;
    private final LeadRepository leadRepository;
    private final MeetingProvider meetingProvider;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;
    private final Duration minNotice;
    private final Duration bookingWindow;

    public ScheduleService(ScheduleRepository scheduleRepository,
                           AvailabilitySlotRepository slotRepository,
                           LeadRepository leadRepository,
                           MeetingProvider meetingProvider,
                           NotificationService notificationService,
                           ApplicationEventPublisher eventPublisher,
                           @Value("${lumina.scheduling.min-notice-minutes:60}") long minNoticeMinutes,
                           @Value("${lumina.scheduling.booking-window-days:60}") long bookingWindowDays) {
        this.scheduleRepository = scheduleRepository;
        this.slotRepository = slotRepository;
        this.leadRepository = leadRepository;
        this.meetingProvider = meetingProvider;
        this.notificationService = notificationService;
        this.eventPublisher = eventPublisher;
        this.minNotice = Duration.ofMinutes(minNoticeMinutes);
        this.bookingWindow = Duration.ofDays(bookingWindowDays);
    }

    /** FR02.1 — open slots from now + minimum notice up to the booking window. */
    @Transactional(readOnly = true)
    public List<ScheduleSlotResponse> getAvailableSlots(UUID technicianId) {
        Instant now = Instant.now();
        Instant from = now.plus(minNotice);
        Instant to = now.plus(bookingWindow);
        List<AvailabilitySlot> slots = technicianId == null
                ? slotRepository.findOpen(SlotStatus.AVAILABLE, from, to)
                : slotRepository.findOpenForTechnician(SlotStatus.AVAILABLE, from, to, technicianId);
        return slots.stream()
                .map(s -> new ScheduleSlotResponse(s.getId(), s.getTechnician().getId(), s.getTechnician().getName(),
                        s.getTechnician().getSpecialty(), s.getStartTime(), s.getEndTime()))
                .toList();
    }

    @Transactional
    public ScheduleResponse book(ScheduleBookingRequest request) {
        UUID leadId = request.leadId();
        if (!leadRepository.existsById(leadId)) {
            throw new LeadNotFoundException(leadId);
        }
        scheduleRepository.findByLeadId(leadId)
                .filter(s -> s.getStatus() != ScheduleStatus.CANCELLED)
                .ifPresent(s -> {
                    throw ApiException.conflict("LEAD_ALREADY_SCHEDULED",
                            "This lead already has a meeting scheduled");
                });

        // The lock: only one request can flip this slot to BOOKED.
        int claimed = slotRepository.claim(request.slotId(), SlotStatus.AVAILABLE, SlotStatus.BOOKED,
                Instant.now().plus(minNotice));
        if (claimed == 0) {
            if (!slotRepository.existsById(request.slotId())) {
                throw ApiException.notFound("SLOT_NOT_FOUND", "Slot not found: " + request.slotId());
            }
            throw ApiException.conflict("SLOT_UNAVAILABLE", "This slot is no longer available");
        }

        // Loaded AFTER claim(): it clears the persistence context.
        AvailabilitySlot slot = slotRepository.findWithTechnicianById(request.slotId()).orElseThrow();
        Technician technician = slot.getTechnician();
        if (!technician.isActive()) {
            // Rolls back the claim as well.
            throw ApiException.conflict("SLOT_UNAVAILABLE", "This slot is no longer available");
        }
        Lead lead = leadRepository.findById(leadId).orElseThrow(() -> new LeadNotFoundException(leadId));

        // A lead whose previous meeting was cancelled reuses its row (lead_id is UNIQUE).
        Schedule schedule = scheduleRepository.findByLeadId(leadId).orElseGet(() -> Schedule.builder().build());
        lead.assignSchedule(schedule); // keeps both sides of Lead <-> Schedule in sync
        schedule.setTechnician(technician);
        schedule.setSlot(slot);
        schedule.setSdrAssigned(technician.getName());
        schedule.setMeetingTime(slot.getStartTime());
        schedule.setStatus(ScheduleStatus.SCHEDULED);
        schedule.setVideoLink(null);
        schedule.setCalendarEventId(null);
        createMeeting(schedule, lead, technician);

        Schedule saved = scheduleRepository.saveAndFlush(schedule);
        eventPublisher.publishEvent(new ScheduleBookedEvent(saved.getId(), leadId));
        return toResponse(saved);
    }

    /**
     * Admin action: CANCELLED frees the slot again (if it is still in the future),
     * COMPLETED just closes the meeting.
     */
    @Transactional
    public ScheduleResponse updateStatus(UUID scheduleId, ScheduleStatus newStatus) {
        Schedule schedule = scheduleRepository.findDetailedById(scheduleId)
                .orElseThrow(() -> ApiException.notFound("SCHEDULE_NOT_FOUND", "Meeting not found: " + scheduleId));
        if (schedule.getStatus() == newStatus) {
            return toResponse(schedule);
        }
        if (schedule.getStatus() == ScheduleStatus.CANCELLED) {
            throw ApiException.conflict("SCHEDULE_CANCELLED", "A cancelled meeting cannot be changed");
        }
        if (newStatus == ScheduleStatus.SCHEDULED) {
            throw ApiException.badRequest("INVALID_STATUS", "Use the booking flow to schedule a meeting");
        }

        schedule.setStatus(newStatus);
        if (newStatus == ScheduleStatus.CANCELLED) {
            AvailabilitySlot slot = schedule.getSlot();
            if (slot != null && slot.getStartTime().isAfter(Instant.now())) {
                slot.setStatus(SlotStatus.AVAILABLE);
            }
            eventPublisher.publishEvent(new ScheduleCancelledEvent(schedule.getId()));
        }
        return toResponse(scheduleRepository.saveAndFlush(schedule));
    }

    /**
     * Runs after the booking commits (ScheduleBookedEventListener): retries the meeting
     * room if the provider failed during booking, then sends the confirmations.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleBooked(UUID scheduleId) {
        Schedule schedule = scheduleRepository.findDetailedById(scheduleId).orElse(null);
        if (schedule == null || schedule.getStatus() != ScheduleStatus.SCHEDULED) {
            return;
        }
        Lead lead = schedule.getLead();
        if (schedule.getVideoLink() == null && schedule.getTechnician() != null) {
            createMeeting(schedule, lead, schedule.getTechnician());
        }
        notificationService.notifyScheduleConfirmed(lead, schedule);
    }

    private void createMeeting(Schedule schedule, Lead lead, Technician technician) {
        MeetingProvider.MeetingRequest request = new MeetingProvider.MeetingRequest(
                "Diagnóstico Lumina Tech Labs — " + lead.getFullName(),
                "Reunião de diagnóstico energético.\n\nCliente: " + lead.getFullName()
                        + " (" + lead.getCompany().getName() + ")\nE-mail: " + lead.getCorporateEmail()
                        + "\nTelefone: " + lead.getPhone() + "\nTécnico: " + technician.getName(),
                schedule.getMeetingTime(), endOf(schedule),
                List.of(lead.getCorporateEmail(), technician.getEmail()));
        MeetingProvider.Meeting meeting;
        try {
            meeting = meetingProvider.create(request);
        } catch (Exception ex) {
            log.warn("Could not create the meeting room for lead {}: {}", lead.getId(), ex.getMessage());
            return;
        }
        schedule.setVideoLink(meeting.joinUrl());
        schedule.setCalendarEventId(meeting.externalId());
        if (meeting.externalId() != null && TransactionSynchronizationManager.isSynchronizationActive()) {
            String eventId = meeting.externalId();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        cancelMeetingQuietly(eventId);
                    }
                }
            });
        }
    }

    private void cancelMeetingQuietly(String externalId) {
        try {
            meetingProvider.cancel(externalId);
        } catch (Exception ex) {
            log.warn("Could not cancel meeting {}: {}", externalId, ex.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void handleCancelled(UUID scheduleId) {
        Schedule schedule = scheduleRepository.findDetailedById(scheduleId).orElse(null);
        if (schedule == null) {
            return;
        }
        if (schedule.getCalendarEventId() != null) {
            cancelMeetingQuietly(schedule.getCalendarEventId());
        }
        notificationService.notifyScheduleCancelled(schedule.getLead(), schedule);
    }

    public ScheduleResponse toResponse(Schedule schedule) {
        Technician technician = schedule.getTechnician();
        return new ScheduleResponse(
                schedule.getId(),
                technician != null ? technician.getId() : null,
                technician != null ? technician.getName() : schedule.getSdrAssigned(),
                schedule.getSdrAssigned(),
                schedule.getMeetingTime(),
                endOf(schedule),
                schedule.getVideoLink(),
                schedule.getStatus());
    }

    private static Instant endOf(Schedule schedule) {
        if (schedule.getSlot() != null) {
            return schedule.getSlot().getEndTime();
        }
        return schedule.getMeetingTime() != null ? schedule.getMeetingTime().plus(LEGACY_MEETING_LENGTH) : null;
    }
}
