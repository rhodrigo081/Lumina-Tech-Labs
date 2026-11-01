package lumina.tech.labs.app.controller.admin;

import jakarta.validation.Valid;
import lumina.tech.labs.app.dto.admin.TechnicianRequest;
import lumina.tech.labs.app.dto.admin.TechnicianResponse;
import lumina.tech.labs.app.service.admin.TechnicianService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/technicians")
public class AdminTechnicianController {

    private final TechnicianService technicianService;

    public AdminTechnicianController(TechnicianService technicianService) {
        this.technicianService = technicianService;
    }

    @GetMapping
    public List<TechnicianResponse> list() {
        return technicianService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TechnicianResponse create(@Valid @RequestBody TechnicianRequest request) {
        return technicianService.create(request);
    }

    @PutMapping("/{id}")
    public TechnicianResponse update(@PathVariable UUID id, @Valid @RequestBody TechnicianRequest request) {
        return technicianService.update(id, request);
    }
}
