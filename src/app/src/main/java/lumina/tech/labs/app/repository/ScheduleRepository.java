package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.model.Schedule;
import lumina.tech.labs.app.enums.ScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {

    /** Natural finder for the 0..1 relationship (`lead_id` UNIQUE) — a Lead has at most one Schedule. */
    Optional<Schedule> findByLeadId(UUID leadId);

    boolean existsByLeadId(UUID leadId);

    /**
     * Application-level safety net against double booking (FR02.2), on top
     * of the optimistic lock performed against Google Calendar/Outlook
     * itself: checks whether the given consultant already has a non-cancelled
     * meeting exactly at that time before attempting the external booking.
     */
    boolean existsBySdrAssignedAndMeetingTimeAndStatusNot(
            String sdrAssigned,
            LocalDateTime meetingTime,
            ScheduleStatus status
    );
}