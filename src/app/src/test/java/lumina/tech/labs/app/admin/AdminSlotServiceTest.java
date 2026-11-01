package lumina.tech.labs.app.admin;

import lumina.tech.labs.app.dto.admin.AdminSlotBatchRequest;
import lumina.tech.labs.app.dto.admin.AdminSlotBatchResponse;
import lumina.tech.labs.app.dto.admin.AdminSlotResponse;
import lumina.tech.labs.app.enums.SlotStatus;
import lumina.tech.labs.app.exception.ApiException;
import lumina.tech.labs.app.model.AvailabilitySlot;
import lumina.tech.labs.app.model.Technician;
import lumina.tech.labs.app.repository.AvailabilitySlotRepository;
import lumina.tech.labs.app.repository.ScheduleRepository;
import lumina.tech.labs.app.service.admin.AdminSlotService;
import lumina.tech.labs.app.service.admin.TechnicianService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class AdminSlotServiceTest {

    private static final ZoneId BRASILIA = ZoneId.of("America/Sao_Paulo");

    private final AvailabilitySlotRepository slotRepository = mock(AvailabilitySlotRepository.class);
    private final TechnicianService technicianService = mock(TechnicianService.class);
    private final AdminSlotService service = new AdminSlotService(slotRepository, mock(ScheduleRepository.class),
            technicianService, BRASILIA);

    private final Technician ana = Technician.builder().id(UUID.randomUUID()).name("Ana").email("ana@lumina.tech").build();
    private final LocalDate nextWeek = LocalDate.now(BRASILIA).plusDays(7);

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        given(technicianService.getOrThrow(ana.getId())).willReturn(ana);
        given(slotRepository.saveAllAndFlush(anyList())).willAnswer(inv -> inv.getArgument(0, List.class));
        given(slotRepository.findOverlapping(eq(ana.getId()), any(), any())).willReturn(List.of());
    }

    @Test
    void generatesSlotsWithDurationAndBreakInBrasiliaTime() {
        AdminSlotBatchResponse response = service.createBatch(request(List.of(nextWeek), "09:00", "12:00", 45, 15));

        assertThat(response.skipped()).isZero();
        assertThat(response.created()).extracting(AdminSlotResponse::startTime).containsExactly(
                at(nextWeek, "09:00"), at(nextWeek, "10:00"), at(nextWeek, "11:00"));
        assertThat(response.created()).allSatisfy(s -> {
            assertThat(s.status()).isEqualTo(SlotStatus.AVAILABLE);
            assertThat(s.endTime()).isEqualTo(s.startTime().plusSeconds(45 * 60));
        });
        // 09:00 in Brasília (UTC-3) is 12:00 UTC.
        assertThat(response.created().get(0).startTime().toString()).endsWith("T12:00:00Z");
    }

    @Test
    void lastSlotMustFitInsideTheWindow() {
        AdminSlotBatchResponse response = service.createBatch(request(List.of(nextWeek), "14:00", "15:30", 60, 0));
        assertThat(response.created()).hasSize(1);
    }

    @Test
    void severalDatesAreDeduplicatedAndSorted() {
        LocalDate day2 = nextWeek.plusDays(1);
        AdminSlotBatchResponse response = service.createBatch(request(List.of(day2, nextWeek, day2), "09:00", "10:00", 60, 0));
        assertThat(response.created()).extracting(AdminSlotResponse::startTime)
                .containsExactly(at(nextWeek, "09:00"), at(day2, "09:00"));
    }

    @Test
    void overlappingAndPastTimesAreSkipped() {
        AvailabilitySlot existing = AvailabilitySlot.builder().technician(ana)
                .startTime(at(nextWeek, "10:30")).endTime(at(nextWeek, "11:15")).status(SlotStatus.AVAILABLE).build();
        given(slotRepository.findOverlapping(eq(ana.getId()), any(), any())).willReturn(List.of(existing));

        AdminSlotBatchResponse response = service.createBatch(request(List.of(nextWeek), "09:00", "12:00", 60, 0));
        assertThat(response.created()).extracting(AdminSlotResponse::startTime).containsExactly(at(nextWeek, "09:00"));
        assertThat(response.skipped()).isEqualTo(2);

        LocalDate yesterday = LocalDate.now(BRASILIA).minusDays(1);
        AdminSlotBatchResponse past = service.createBatch(request(List.of(yesterday), "09:00", "12:00", 60, 0));
        assertThat(past.created()).isEmpty();
        assertThat(past.skipped()).isEqualTo(3);
    }

    @Test
    void invalidWindowAndInactiveTechnicianAreRejected() {
        assertThatThrownBy(() -> service.createBatch(request(List.of(nextWeek), "12:00", "09:00", 60, 0)))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_RANGE");

        ana.setActive(false);
        assertThatThrownBy(() -> service.createBatch(request(List.of(nextWeek), "09:00", "12:00", 60, 0)))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("TECHNICIAN_INACTIVE");
    }

    @Test
    void listRangeIsLimited() {
        Instant now = Instant.now();
        assertThatThrownBy(() -> service.list(now, now.plusSeconds(63L * 24 * 3600), null))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_RANGE");
        assertThatThrownBy(() -> service.list(now, now, null))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_RANGE");
    }

    private AdminSlotBatchRequest request(List<LocalDate> dates, String start, String end, int duration, int pause) {
        return new AdminSlotBatchRequest(ana.getId(), dates, LocalTime.parse(start), LocalTime.parse(end), duration, pause);
    }

    private static Instant at(LocalDate date, String time) {
        return date.atTime(LocalTime.parse(time)).atZone(BRASILIA).toInstant();
    }
}
