package lumina.tech.labs.app.model;

import lumina.tech.labs.app.enums.ScheduleStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

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

    @Column(name = "sdr_assigned", length = 150)
    private String sdrAssigned;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_id", foreignKey = @ForeignKey(name = "fk_schedule_technician"))
    private Technician technician;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", foreignKey = @ForeignKey(name = "fk_schedule_slot"))
    private AvailabilitySlot slot;

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
