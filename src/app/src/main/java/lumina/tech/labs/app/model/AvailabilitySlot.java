package lumina.tech.labs.app.model;

import jakarta.persistence.*;
import lombok.*;
import lumina.tech.labs.app.enums.SlotStatus;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A bookable time window of one technician, created by an admin.
 * Booking flips status AVAILABLE -> BOOKED through a conditional UPDATE
 * (see AvailabilitySlotRepository#claim), so two leads can never take the
 * same slot even when they confirm at the same instant.
 */
@Entity
@Table(name = "availability_slot", uniqueConstraints = {
        @UniqueConstraint(name = "uk_slot_technician_start", columnNames = {"technician_id", "start_time"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class AvailabilitySlot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "technician_id", nullable = false, foreignKey = @ForeignKey(name = "fk_slot_technician"))
    private Technician technician;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time", nullable = false)
    private Instant endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SlotStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
