package lumina.tech.labs.app.service.admin;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lumina.tech.labs.app.dto.admin.AdminDashboardResponse;
import lumina.tech.labs.app.dto.admin.AdminLeadDetailResponse;
import lumina.tech.labs.app.dto.admin.AdminLeadSummaryResponse;
import lumina.tech.labs.app.dto.admin.AdminMeetingInfo;
import lumina.tech.labs.app.dto.admin.PageResponse;
import lumina.tech.labs.app.enums.Priority;
import lumina.tech.labs.app.enums.ScheduleStatus;
import lumina.tech.labs.app.enums.SlotStatus;
import lumina.tech.labs.app.exception.LeadNotFoundException;
import lumina.tech.labs.app.mapper.LeadMapper;
import lumina.tech.labs.app.model.Company;
import lumina.tech.labs.app.model.Diagnostic;
import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.model.Schedule;
import lumina.tech.labs.app.repository.AvailabilitySlotRepository;
import lumina.tech.labs.app.repository.ConsentLogRepository;
import lumina.tech.labs.app.repository.CrmSyncLogRepository;
import lumina.tech.labs.app.repository.LeadRepository;
import lumina.tech.labs.app.repository.ScheduleRepository;
import lumina.tech.labs.app.repository.TechnicianRepository;
import lumina.tech.labs.app.service.ScheduleService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.UUID;

@Service
public class AdminLeadService {

    private static final int MAX_PAGE_SIZE = 100;

    private final LeadRepository leadRepository;
    private final ConsentLogRepository consentLogRepository;
    private final CrmSyncLogRepository crmSyncLogRepository;
    private final ScheduleRepository scheduleRepository;
    private final AvailabilitySlotRepository slotRepository;
    private final TechnicianRepository technicianRepository;
    private final ScheduleService scheduleService;
    private final LeadMapper leadMapper;

    public AdminLeadService(LeadRepository leadRepository,
                            ConsentLogRepository consentLogRepository,
                            CrmSyncLogRepository crmSyncLogRepository,
                            ScheduleRepository scheduleRepository,
                            AvailabilitySlotRepository slotRepository,
                            TechnicianRepository technicianRepository,
                            ScheduleService scheduleService,
                            LeadMapper leadMapper) {
        this.leadRepository = leadRepository;
        this.consentLogRepository = consentLogRepository;
        this.crmSyncLogRepository = crmSyncLogRepository;
        this.scheduleRepository = scheduleRepository;
        this.slotRepository = slotRepository;
        this.technicianRepository = technicianRepository;
        this.scheduleService = scheduleService;
        this.leadMapper = leadMapper;
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponse dashboard() {
        Instant now = Instant.now();
        return new AdminDashboardResponse(
                leadRepository.count(),
                leadRepository.countByCreatedAtAfter(now.minus(Duration.ofDays(7))),
                leadRepository.countByPriority(Priority.HIGH_PRIORITY),
                scheduleRepository.countByStatusAndMeetingTimeAfter(ScheduleStatus.SCHEDULED, now),
                slotRepository.countByStatusAndStartTimeAfter(SlotStatus.AVAILABLE, now),
                technicianRepository.countByActiveTrue());
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminLeadSummaryResponse> search(String search, Priority priority, Boolean scheduled,
                                                         int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        PageRequest pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(leadRepository.findAll(filter(search, priority, scheduled), pageable), this::toSummary);
    }

    @Transactional(readOnly = true)
    public AdminLeadDetailResponse detail(UUID id) {
        Lead lead = leadRepository.findDetailedById(id).orElseThrow(() -> new LeadNotFoundException(id));
        Company company = lead.getCompany();
        return new AdminLeadDetailResponse(
                lead.getId(), lead.getFullName(), lead.getCorporateEmail(), lead.getPhone(), lead.getJobTitle(),
                company.getName(), company.getEmailDomain(), lead.getPriority(), lead.getCreatedAt(),
                lead.getDiagnostic() != null ? leadMapper.toResponse(lead.getDiagnostic()) : null,
                toMeeting(lead.getSchedule()),
                consentLogRepository.findByLeadIdOrderByAcceptedAtDesc(id).stream()
                        .map(c -> new AdminLeadDetailResponse.Consent(c.getTermVersion(), c.getSourceIp(), c.getAcceptedAt()))
                        .toList(),
                crmSyncLogRepository.findByLeadIdOrderBySyncedAtDesc(id).stream()
                        .map(c -> new AdminLeadDetailResponse.CrmSync(c.getCrmProvider(), c.getSyncStatus(),
                                c.getExternalCrmId(), c.getSyncedAt()))
                        .toList());
    }

    private AdminLeadSummaryResponse toSummary(Lead lead) {
        Diagnostic d = lead.getDiagnostic();
        return new AdminLeadSummaryResponse(
                lead.getId(), lead.getFullName(), lead.getCorporateEmail(), lead.getPhone(), lead.getJobTitle(),
                lead.getCompany().getName(), lead.getPriority(), lead.getCreatedAt(),
                d != null ? d.getWorkstations() : null,
                d != null ? d.getMonthlyEnergyBill() : null,
                d != null ? d.getAnnualSavings() : null,
                toMeeting(lead.getSchedule()));
    }

    private AdminMeetingInfo toMeeting(Schedule schedule) {
        if (schedule == null) {
            return null;
        }
        var r = scheduleService.toResponse(schedule);
        return new AdminMeetingInfo(r.id(), r.technicianId(), r.technicianName(), r.meetingTime(), r.endTime(),
                r.videoLink(), r.status());
    }

    private static Specification<Lead> filter(String search, Priority priority, Boolean scheduled) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase()
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                Join<Lead, Company> company = root.join("company", JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), like, '\\'),
                        cb.like(cb.lower(root.get("corporateEmail")), like, '\\'),
                        cb.like(cb.lower(company.get("name")), like, '\\')));
            }
            if (priority != null) {
                predicates.add(cb.equal(root.get("priority"), priority));
            }
            if (scheduled != null) {
                Join<Lead, Schedule> schedule = root.join("schedule", JoinType.LEFT);
                Predicate active = cb.and(cb.isNotNull(schedule.get("id")),
                        cb.notEqual(schedule.get("status"), ScheduleStatus.CANCELLED));
                predicates.add(scheduled ? active : cb.not(active));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
