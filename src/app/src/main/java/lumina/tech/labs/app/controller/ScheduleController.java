package lumina.tech.labs.app.controller;

import lumina.tech.labs.app.dto.request.ScheduleBookingRequest;
import lumina.tech.labs.app.dto.response.ScheduleResponse;
import lumina.tech.labs.app.dto.response.ScheduleSlotResponse;
import lumina.tech.labs.app.service.ScheduleService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    /** FR02.1 — public endpoint, cached in Redis (see ScheduleService). */
    @GetMapping("/slots")
    public ResponseEntity<List<ScheduleSlotResponse>> getSlots(@RequestParam String consultantId) {
        return ResponseEntity.ok(scheduleService.getAvailableSlots(consultantId));
    }

    /** FR02.2 / FR02.3 — public endpoint; the Lead itself acts as the caller's credential (leadId in the body). */
    @PostMapping("/book")
    public ResponseEntity<ScheduleResponse> book(@Valid @RequestBody ScheduleBookingRequest request) {
        return ResponseEntity.status(201).body(scheduleService.book(request));
    }
}
