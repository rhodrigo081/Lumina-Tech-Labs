package lumina.tech.labs.app.scheduling;

import lumina.tech.labs.app.dto.admin.AdminLeadSummaryResponse;
import lumina.tech.labs.app.dto.admin.PageResponse;
import lumina.tech.labs.app.dto.request.ScheduleBookingRequest;
import lumina.tech.labs.app.dto.response.ScheduleResponse;
import lumina.tech.labs.app.dto.response.ScheduleSlotResponse;
import lumina.tech.labs.app.enums.Priority;
import lumina.tech.labs.app.enums.ScheduleStatus;
import lumina.tech.labs.app.enums.SlotStatus;
import lumina.tech.labs.app.exception.ApiException;
import lumina.tech.labs.app.integration.MeetingProvider;
import lumina.tech.labs.app.mapper.LeadMapperImpl;
import lumina.tech.labs.app.model.AvailabilitySlot;
import lumina.tech.labs.app.model.Company;
import lumina.tech.labs.app.model.Diagnostic;
import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.model.Technician;
import lumina.tech.labs.app.repository.AvailabilitySlotRepository;
import lumina.tech.labs.app.repository.CompanyRepository;
import lumina.tech.labs.app.repository.LeadRepository;
import lumina.tech.labs.app.repository.ScheduleRepository;
import lumina.tech.labs.app.repository.TechnicianRepository;
import lumina.tech.labs.app.service.NotificationService;
import lumina.tech.labs.app.service.ScheduleService;
import lumina.tech.labs.app.service.admin.AdminLeadService;
import lumina.tech.labs.app.service.admin.AdminSlotService;
import lumina.tech.labs.app.service.admin.TechnicianService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import({ScheduleService.class, AdminLeadService.class, AdminSlotService.class, TechnicianService.class,
        LeadMapperImpl.class})
class SchedulingFlowTest {

    @MockitoBean
    NotificationService notificationService;

    @MockitoBean
    MeetingProvider meetingProvider;

    @Autowired ScheduleService scheduleService;
    @Autowired AdminLeadService adminLeadService;
    @Autowired AvailabilitySlotRepository slotRepository;
    @Autowired ScheduleRepository scheduleRepository;
    @Autowired TechnicianRepository technicianRepository;
    @Autowired LeadRepository leadRepository;
    @Autowired CompanyRepository companyRepository;

    Technician ana;
    Technician bruno;
    AvailabilitySlot anaTomorrow;
    AvailabilitySlot anaTomorrowLater;
    AvailabilitySlot brunoTomorrow;
    Lead lead;

    @BeforeEach
    void setUp() {
        given(meetingProvider.create(any())).willReturn(
                new MeetingProvider.Meeting("event-1", "https://meet.google.com/abc-defg-hij"));
        ana = technicianRepository.save(Technician.builder().name("Ana Souza").email("ana@lumina.tech").specialty("HVAC").build());
        bruno = technicianRepository.save(Technician.builder().name("Bruno Lima").email("bruno@lumina.tech").build());

        Instant tomorrow = Instant.now().plus(Duration.ofDays(1)).truncatedTo(ChronoUnit.HOURS);
        anaTomorrow = slot(ana, tomorrow);
        anaTomorrowLater = slot(ana, tomorrow.plus(Duration.ofHours(2)));
        brunoTomorrow = slot(bruno, tomorrow);
        lead = lead("Carla Mendes", "carla@acme.com.br", "Acme", Priority.HIGH_PRIORITY);
    }

    @Test
    void publicGridListsOnlyOpenSlotsOfActiveTechnicians() {
        assertThat(scheduleService.getAvailableSlots(null)).extracting(ScheduleSlotResponse::id)
                .containsExactlyInAnyOrder(anaTomorrow.getId(), anaTomorrowLater.getId(), brunoTomorrow.getId());

        bruno.setActive(false);
        technicianRepository.saveAndFlush(bruno);

        assertThat(scheduleService.getAvailableSlots(null)).extracting(ScheduleSlotResponse::technicianName)
                .containsOnly("Ana Souza");
        assertThat(scheduleService.getAvailableSlots(bruno.getId())).isEmpty();
    }

    @Test
    void bookingClaimsTheSlotAndHidesItFromTheGrid() {
        ScheduleResponse response = scheduleService.book(new ScheduleBookingRequest(lead.getId(), anaTomorrow.getId()));

        assertThat(response.status()).isEqualTo(ScheduleStatus.SCHEDULED);
        assertThat(response.technicianName()).isEqualTo("Ana Souza");
        assertThat(response.meetingTime()).isEqualTo(anaTomorrow.getStartTime());
        assertThat(response.endTime()).isEqualTo(anaTomorrow.getEndTime());
        assertThat(response.videoLink()).isEqualTo("https://meet.google.com/abc-defg-hij");
        assertThat(slotRepository.findById(anaTomorrow.getId()).orElseThrow().getStatus()).isEqualTo(SlotStatus.BOOKED);
        assertThat(scheduleService.getAvailableSlots(null)).extracting(ScheduleSlotResponse::id)
                .doesNotContain(anaTomorrow.getId());
    }

    @Test
    void aSlotCannotBeBookedTwice() {
        Lead other = lead("Diego Rocha", "diego@globex.com", "Globex", Priority.MEDIUM_PRIORITY);
        scheduleService.book(new ScheduleBookingRequest(lead.getId(), anaTomorrow.getId()));

        assertThatThrownBy(() -> scheduleService.book(new ScheduleBookingRequest(other.getId(), anaTomorrow.getId())))
                .isInstanceOf(ApiException.class)
                .extracting("code").isEqualTo("SLOT_UNAVAILABLE");
    }

    @Test
    void aLeadCannotHaveTwoActiveMeetings() {
        scheduleService.book(new ScheduleBookingRequest(lead.getId(), anaTomorrow.getId()));

        assertThatThrownBy(() -> scheduleService.book(new ScheduleBookingRequest(lead.getId(), brunoTomorrow.getId())))
                .isInstanceOf(ApiException.class)
                .extracting("code").isEqualTo("LEAD_ALREADY_SCHEDULED");
        assertThat(slotRepository.findById(brunoTomorrow.getId()).orElseThrow().getStatus()).isEqualTo(SlotStatus.AVAILABLE);
    }

    @Test
    void unknownSlotOrLeadIsNotFound() {
        assertThatThrownBy(() -> scheduleService.book(new ScheduleBookingRequest(lead.getId(), UUID.randomUUID())))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("SLOT_NOT_FOUND");
        assertThatThrownBy(() -> scheduleService.book(new ScheduleBookingRequest(UUID.randomUUID(), anaTomorrow.getId())))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("LEAD_NOT_FOUND");
    }

    @Test
    void slotsStartingTooSoonCannotBeBooked() {
        AvailabilitySlot soon = slot(ana, Instant.now().plus(Duration.ofMinutes(10)));

        assertThat(scheduleService.getAvailableSlots(null)).extracting(ScheduleSlotResponse::id).doesNotContain(soon.getId());
        assertThatThrownBy(() -> scheduleService.book(new ScheduleBookingRequest(lead.getId(), soon.getId())))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("SLOT_UNAVAILABLE");
    }

    @Test
    void cancellingFreesTheSlotAndTheLeadCanRebook() {
        ScheduleResponse first = scheduleService.book(new ScheduleBookingRequest(lead.getId(), anaTomorrow.getId()));

        ScheduleResponse cancelled = scheduleService.updateStatus(first.id(), ScheduleStatus.CANCELLED);
        assertThat(cancelled.status()).isEqualTo(ScheduleStatus.CANCELLED);
        assertThat(slotRepository.findById(anaTomorrow.getId()).orElseThrow().getStatus()).isEqualTo(SlotStatus.AVAILABLE);

        ScheduleResponse second = scheduleService.book(new ScheduleBookingRequest(lead.getId(), brunoTomorrow.getId()));
        assertThat(second.id()).as("the cancelled row is reused (lead_id is UNIQUE)").isEqualTo(first.id());
        assertThat(second.technicianName()).isEqualTo("Bruno Lima");
        assertThat(scheduleRepository.count()).isEqualTo(1);
    }

    @Test
    void cancelledMeetingCannotBeReopenedOrCompleted() {
        ScheduleResponse booked = scheduleService.book(new ScheduleBookingRequest(lead.getId(), anaTomorrow.getId()));
        scheduleService.updateStatus(booked.id(), ScheduleStatus.CANCELLED);

        assertThatThrownBy(() -> scheduleService.updateStatus(booked.id(), ScheduleStatus.COMPLETED))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("SCHEDULE_CANCELLED");
    }

    @Test
    void openSlotsCanBeDeletedButBookedOnesCannot() {
        AdminSlotService slots = new AdminSlotService(slotRepository, scheduleRepository,
                new TechnicianService(technicianRepository), java.time.ZoneId.of("America/Sao_Paulo"));
        scheduleService.book(new ScheduleBookingRequest(lead.getId(), anaTomorrow.getId()));

        slots.delete(anaTomorrowLater.getId());
        assertThat(slotRepository.existsById(anaTomorrowLater.getId())).isFalse();

        assertThatThrownBy(() -> slots.delete(anaTomorrow.getId()))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("SLOT_BOOKED");
    }

    @Test
    void adminViewShowsWhoBookedEachSlot() {
        AdminSlotService slots = new AdminSlotService(slotRepository, scheduleRepository,
                new TechnicianService(technicianRepository), java.time.ZoneId.of("America/Sao_Paulo"));
        scheduleService.book(new ScheduleBookingRequest(lead.getId(), anaTomorrow.getId()));

        var list = slots.list(Instant.now(), Instant.now().plus(Duration.ofDays(3)), ana.getId());
        assertThat(list).hasSize(2);
        var booked = list.stream().filter(s -> s.id().equals(anaTomorrow.getId())).findFirst().orElseThrow();
        assertThat(booked.status()).isEqualTo(SlotStatus.BOOKED);
        assertThat(booked.booking().leadName()).isEqualTo("Carla Mendes");
        assertThat(booked.booking().companyName()).isEqualTo("Acme");
    }

    @Test
    void overlappingQueryFindsIntersectingSlotsOnly() {
        Instant start = anaTomorrow.getStartTime();
        assertThat(slotRepository.findOverlapping(ana.getId(), start.plus(Duration.ofMinutes(30)), start.plus(Duration.ofMinutes(90))))
                .extracting(AvailabilitySlot::getId).containsExactly(anaTomorrow.getId());
        assertThat(slotRepository.findOverlapping(ana.getId(), anaTomorrow.getEndTime(), anaTomorrowLater.getStartTime()))
                .isEmpty();
    }

    @Test
    void adminLeadSearchFiltersByTextPriorityAndMeeting() {
        lead("Diego Rocha", "diego@globex.com", "Globex", Priority.MEDIUM_PRIORITY);
        scheduleService.book(new ScheduleBookingRequest(lead.getId(), anaTomorrow.getId()));

        PageResponse<AdminLeadSummaryResponse> all = adminLeadService.search(null, null, null, 0, 20);
        assertThat(all.totalElements()).isEqualTo(2);

        assertThat(adminLeadService.search("GLOBEX", null, null, 0, 20).content())
                .extracting(AdminLeadSummaryResponse::fullName).containsExactly("Diego Rocha");
        assertThat(adminLeadService.search("100%", null, null, 0, 20).content()).isEmpty();
        assertThat(adminLeadService.search(null, Priority.HIGH_PRIORITY, null, 0, 20).content())
                .extracting(AdminLeadSummaryResponse::fullName).containsExactly("Carla Mendes");

        var scheduled = adminLeadService.search(null, null, true, 0, 20).content();
        assertThat(scheduled).extracting(AdminLeadSummaryResponse::fullName).containsExactly("Carla Mendes");
        assertThat(scheduled.get(0).meeting().technicianName()).isEqualTo("Ana Souza");
        assertThat(scheduled.get(0).annualSavings()).isEqualByComparingTo("60480.00");
        assertThat(adminLeadService.search(null, null, false, 0, 20).content())
                .extracting(AdminLeadSummaryResponse::fullName).containsExactly("Diego Rocha");

        var detail = adminLeadService.detail(lead.getId());
        assertThat(detail.companyDomain()).isEqualTo("acme.com.br");
        assertThat(detail.diagnostic().workstations()).isEqualTo(80);
        assertThat(detail.meeting().status()).isEqualTo(ScheduleStatus.SCHEDULED);

        var dashboard = adminLeadService.dashboard();
        assertThat(dashboard.totalLeads()).isEqualTo(2);
        assertThat(dashboard.highPriorityLeads()).isEqualTo(1);
        assertThat(dashboard.upcomingMeetings()).isEqualTo(1);
        assertThat(dashboard.openSlots()).isEqualTo(2);
        assertThat(dashboard.activeTechnicians()).isEqualTo(2);
    }

    private AvailabilitySlot slot(Technician technician, Instant start) {
        return slotRepository.saveAndFlush(AvailabilitySlot.builder()
                .technician(technician)
                .startTime(start)
                .endTime(start.plus(Duration.ofMinutes(45)))
                .status(SlotStatus.AVAILABLE)
                .build());
    }

    private Lead lead(String name, String email, String companyName, Priority priority) {
        Company company = companyRepository.save(Company.builder().name(companyName)
                .emailDomain(email.substring(email.indexOf('@') + 1)).build());
        Lead lead = Lead.builder().company(company).fullName(name).corporateEmail(email)
                .phone("(81) 99999-0001").jobTitle("CFO").priority(priority).build();
        lead.assignDiagnostic(Diagnostic.builder()
                .areaM2(new BigDecimal("1200.00")).workstations(80).monthlyEnergyBill(new BigDecimal("18000.00"))
                .currentInfrastructure("CENTRAL_AC_MIXED_LIGHTING")
                .consumptionReductionPct(new BigDecimal("28.00")).annualSavings(new BigDecimal("60480.00"))
                .paybackMonths(new BigDecimal("5.6")).co2ReductionTons(new BigDecimal("25.40"))
                .build());
        return leadRepository.saveAndFlush(lead);
    }
}
