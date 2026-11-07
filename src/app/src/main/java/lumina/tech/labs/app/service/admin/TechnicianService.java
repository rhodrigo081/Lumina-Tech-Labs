package lumina.tech.labs.app.service.admin;

import lumina.tech.labs.app.dto.admin.TechnicianRequest;
import lumina.tech.labs.app.dto.admin.TechnicianResponse;
import lumina.tech.labs.app.exception.ApiException;
import lumina.tech.labs.app.model.Technician;
import lumina.tech.labs.app.repository.TechnicianRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class TechnicianService {

    private final TechnicianRepository technicianRepository;

    public TechnicianService(TechnicianRepository technicianRepository) {
        this.technicianRepository = technicianRepository;
    }

    @Transactional(readOnly = true)
    public List<TechnicianResponse> list() {
        return technicianRepository.findAllByOrderByActiveDescNameAsc().stream().map(TechnicianService::toResponse).toList();
    }

    @Transactional
    public TechnicianResponse create(TechnicianRequest request) {
        String email = normalizedEmail(request);
        if (technicianRepository.existsByEmailIgnoreCase(email)) {
            throw emailInUse();
        }
        return save(Technician.builder().build(), request, email);
    }

    @Transactional
    public TechnicianResponse update(UUID id, TechnicianRequest request) {
        Technician technician = getOrThrow(id);
        String email = normalizedEmail(request);
        if (technicianRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw emailInUse();
        }
        return save(technician, request, email);
    }

    private TechnicianResponse save(Technician technician, TechnicianRequest request, String email) {
        technician.setName(request.name().trim());
        technician.setEmail(email);
        technician.setSpecialty(blankToNull(request.specialty()));
        if (request.active() != null) {
            technician.setActive(request.active());
        }
        return toResponse(technicianRepository.saveAndFlush(technician));
    }

    private static String normalizedEmail(TechnicianRequest request) {
        return request.email().trim().toLowerCase();
    }

    private static ApiException emailInUse() {
        return ApiException.conflict("TECHNICIAN_EMAIL_IN_USE", "A technician with this email already exists");
    }

    public Technician getOrThrow(UUID id) {
        return technicianRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("TECHNICIAN_NOT_FOUND", "Technician not found: " + id));
    }

    private static TechnicianResponse toResponse(Technician t) {
        return new TechnicianResponse(t.getId(), t.getName(), t.getEmail(), t.getSpecialty(), t.isActive(), t.getCreatedAt());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
