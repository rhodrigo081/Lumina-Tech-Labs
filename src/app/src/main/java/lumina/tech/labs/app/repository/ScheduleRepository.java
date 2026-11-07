package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.enums.ScheduleStatus;
import lumina.tech.labs.app.model.Schedule;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {

    Optional<Schedule> findByLeadId(UUID leadId);

    @EntityGraph(attributePaths = {"lead", "technician", "slot"})
    Optional<Schedule> findDetailedById(UUID id);

    @EntityGraph(attributePaths = {"lead", "lead.company"})
    List<Schedule> findBySlotIdInAndStatusNot(Collection<UUID> slotIds, ScheduleStatus status);

    long countByStatusAndMeetingTimeAfter(ScheduleStatus status, Instant after);
}
