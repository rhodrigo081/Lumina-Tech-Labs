package lumina.tech.labs.app.controller.admin;

import jakarta.validation.Valid;
import lumina.tech.labs.app.dto.admin.AdminSlotBatchRequest;
import lumina.tech.labs.app.dto.admin.AdminSlotBatchResponse;
import lumina.tech.labs.app.dto.admin.AdminSlotResponse;
import lumina.tech.labs.app.dto.admin.ScheduleStatusRequest;
import lumina.tech.labs.app.dto.response.ScheduleResponse;
import lumina.tech.labs.app.service.ScheduleService;
import lumina.tech.labs.app.service.admin.AdminSlotService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminScheduleController {

    private final AdminSlotService adminSlotService;
    private final ScheduleService scheduleService;

    public AdminScheduleController(AdminSlotService adminSlotService, ScheduleService scheduleService) {
        this.adminSlotService = adminSlotService;
        this.scheduleService = scheduleService;
    }

    /** Every slot (open and booked) between `from` and `to` (ISO-8601 instants, max 62 days). */
    @GetMapping("/slots")
    public List<AdminSlotResponse> slots(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
                                         @RequestParam(required = false) UUID technicianId) {
        return adminSlotService.list(from, to, technicianId);
    }

    @PostMapping("/slots")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminSlotBatchResponse createSlots(@Valid @RequestBody AdminSlotBatchRequest request) {
        return adminSlotService.createBatch(request);
    }

    @DeleteMapping("/slots/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSlot(@PathVariable UUID id) {
        adminSlotService.delete(id);
    }

    /** CANCELLED frees the slot for other leads; COMPLETED closes the meeting. */
    @PatchMapping("/schedules/{id}/status")
    public ScheduleResponse updateMeetingStatus(@PathVariable UUID id, @Valid @RequestBody ScheduleStatusRequest request) {
        return scheduleService.updateStatus(id, request.status());
    }
}
