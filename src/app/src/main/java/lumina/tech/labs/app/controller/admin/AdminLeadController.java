package lumina.tech.labs.app.controller.admin;

import lumina.tech.labs.app.dto.admin.AdminDashboardResponse;
import lumina.tech.labs.app.dto.admin.AdminLeadDetailResponse;
import lumina.tech.labs.app.dto.admin.AdminLeadSummaryResponse;
import lumina.tech.labs.app.dto.admin.PageResponse;
import lumina.tech.labs.app.enums.Priority;
import lumina.tech.labs.app.service.admin.AdminLeadService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminLeadController {

    private final AdminLeadService adminLeadService;

    public AdminLeadController(AdminLeadService adminLeadService) {
        this.adminLeadService = adminLeadService;
    }

    @GetMapping("/dashboard")
    public AdminDashboardResponse dashboard() {
        return adminLeadService.dashboard();
    }

    @GetMapping("/leads")
    public PageResponse<AdminLeadSummaryResponse> leads(@RequestParam(required = false) String search,
                                                        @RequestParam(required = false) Priority priority,
                                                        @RequestParam(required = false) Boolean scheduled,
                                                        @RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "20") int size) {
        return adminLeadService.search(search, priority, scheduled, page, size);
    }

    @GetMapping("/leads/{id}")
    public AdminLeadDetailResponse lead(@PathVariable UUID id) {
        return adminLeadService.detail(id);
    }
}
