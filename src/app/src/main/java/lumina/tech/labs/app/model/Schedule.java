package lumina.tech.labs.app.model;

import lumina.tech.labs.app.enums.ScheduleStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Relationship: SCHEDULE (1) <-> (0..1) LEAD — OWNING side.
 * Unlike Diagnostic, this relationship is OPTIONAL from the Lead's
 * perspective (not every lead books a meeting) but a Schedule row,
 * once created, always belongs to exactly one Lead — hence
 * optional = false on this side, combined with `unique = true` on the
 * FK to guarantee at most one Schedule per Lead at the database level.
 */
@Entity
@Table(name = "schedule")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lead_id", nullable = false, unique = true,
            foreignKey = @ForeignKey(name = "fk_schedule_lead"))
    private Lead lead;

    /** Display name of the technician at booking time (kept for history even if the technician is renamed). */
    @Column(name = "sdr_assigned", length = 150)
    private String sdrAssigned;

    /** Technician running the meeting. Nullable only for rows created before V2. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_id", foreignKey = @ForeignKey(name = "fk_schedule_technician"))
    private Technician technician;

    /** Availability slot consumed by this booking. Nullable only for rows created before V2. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", foreignKey = @ForeignKey(name = "fk_schedule_slot"))
    private AvailabilitySlot slot;

    /** Event id returned by the calendar provider, filled after commit by ScheduleBookedEventListener. */
    @Column(name = "calendar_event_id", length = 255)
    private String calendarEventId;

    @Column(name = "meeting_time")
    private Instant meetingTime;

    @Column(name = "video_link", length = 500)
    private String videoLink;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ScheduleStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;


}