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
        String email = request.email().trim().toLowerCase();
        if (technicianRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("TECHNICIAN_EMAIL_IN_USE", "A technician with this email already exists");
        }
        Technician technician = Technician.builder()
                .name(request.name().trim())
                .email(email)
                .specialty(blankToNull(request.specialty()))
                .active(request.active() == null || request.active())
                .build();
        return toResponse(technicianRepository.saveAndFlush(technician));
    }

    @Transactional
    public TechnicianResponse update(UUID id, TechnicianRequest request) {
        Technician technician = getOrThrow(id);
        String email = request.email().trim().toLowerCase();
        if (technicianRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw ApiException.conflict("TECHNICIAN_EMAIL_IN_USE", "A technician with this email already exists");
        }
        technician.setName(request.name().trim());
        technician.setEmail(email);
        technician.setSpecialty(blankToNull(request.specialty()));
        if (request.active() != null) {
            // Deactivating hides the technician's open slots from the public grid; existing meetings are kept.
            technician.setActive(request.active());
        }
        return toResponse(technicianRepository.saveAndFlush(technician));
    }

    public Technician getOrThrow(UUID id) {
        return technicianRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("TECHNICIAN_NOT_FOUND", "Technician not found: " + id));
    }

    static TechnicianResponse toResponse(Technician t) {
        return new TechnicianResponse(t.getId(), t.getName(), t.getEmail(), t.getSpecialty(), t.isActive(), t.getCreatedAt());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
