package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.enums.SlotStatus;
import lumina.tech.labs.app.model.AvailabilitySlot;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AvailabilitySlotRepository extends JpaRepository<AvailabilitySlot, UUID> {

    @EntityGraph(attributePaths = "technician")
    @Query("""
            select s from AvailabilitySlot s
            where s.status = :status and s.technician.active = true
              and s.startTime >= :from and s.startTime < :to
            order by s.startTime asc, s.technician.name asc
            """)
    List<AvailabilitySlot> findOpen(@Param("status") SlotStatus status,
                                    @Param("from") Instant from,
                                    @Param("to") Instant to);

    @EntityGraph(attributePaths = "technician")
    @Query("""
            select s from AvailabilitySlot s
            where s.status = :status and s.technician.active = true and s.technician.id = :technicianId
              and s.startTime >= :from and s.startTime < :to
            order by s.startTime asc
            """)
    List<AvailabilitySlot> findOpenForTechnician(@Param("status") SlotStatus status,
                                                 @Param("from") Instant from,
                                                 @Param("to") Instant to,
                                                 @Param("technicianId") UUID technicianId);

    @EntityGraph(attributePaths = "technician")
    @Query("""
            select s from AvailabilitySlot s
            where s.startTime >= :from and s.startTime < :to
            order by s.startTime asc, s.technician.name asc
            """)
    List<AvailabilitySlot> findInRange(@Param("from") Instant from, @Param("to") Instant to);

    @EntityGraph(attributePaths = "technician")
    @Query("""
            select s from AvailabilitySlot s
            where s.technician.id = :technicianId and s.startTime >= :from and s.startTime < :to
            order by s.startTime asc
            """)
    List<AvailabilitySlot> findInRangeForTechnician(@Param("from") Instant from,
                                                    @Param("to") Instant to,
                                                    @Param("technicianId") UUID technicianId);

    @Query("""
            select s from AvailabilitySlot s
            where s.technician.id = :technicianId and s.startTime < :to and s.endTime > :from
            """)
    List<AvailabilitySlot> findOverlapping(@Param("technicianId") UUID technicianId,
                                           @Param("from") Instant from,
                                           @Param("to") Instant to);

    @EntityGraph(attributePaths = "technician")
    Optional<AvailabilitySlot> findWithTechnicianById(UUID id);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update AvailabilitySlot s set s.status = :booked
            where s.id = :id and s.status = :available and s.startTime > :notBefore
            """)
    int claim(@Param("id") UUID id,
              @Param("available") SlotStatus available,
              @Param("booked") SlotStatus booked,
              @Param("notBefore") Instant notBefore);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from AvailabilitySlot s where s.id = :id and s.status = :available")
    int deleteIfOpen(@Param("id") UUID id, @Param("available") SlotStatus available);

    long countByStatusAndStartTimeAfter(SlotStatus status, Instant after);
}
