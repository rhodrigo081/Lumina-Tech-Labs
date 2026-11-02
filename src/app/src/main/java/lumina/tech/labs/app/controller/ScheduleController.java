package lumina.tech.labs.app.controller;

import jakarta.validation.Valid;
import lumina.tech.labs.app.dto.request.ScheduleBookingRequest;
import lumina.tech.labs.app.dto.response.ScheduleResponse;
import lumina.tech.labs.app.dto.response.ScheduleSlotResponse;
import lumina.tech.labs.app.service.ScheduleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    @GetMapping("/slots")
    public ResponseEntity<List<ScheduleSlotResponse>> getSlots(@RequestParam(required = false) UUID technicianId) {
        return ResponseEntity.ok(scheduleService.getAvailableSlots(technicianId));
    }

    @PostMapping("/book")
    public ResponseEntity<ScheduleResponse> book(@Valid @RequestBody ScheduleBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleService.book(request));
    }
}
