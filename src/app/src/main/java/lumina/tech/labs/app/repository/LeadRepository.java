package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.enums.Priority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface LeadRepository extends JpaRepository<Lead, UUID>, JpaSpecificationExecutor<Lead> {

    @Override
    @EntityGraph(attributePaths = {"company", "diagnostic", "schedule", "schedule.technician"})
    Page<Lead> findAll(Specification<Lead> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"company", "diagnostic", "schedule", "schedule.technician"})
    Optional<Lead> findDetailedById(UUID id);

    long countByCreatedAtAfter(Instant after);

    long countByPriority(Priority priority);

    boolean existsByCorporateEmail(String corporateEmail);

    @EntityGraph(attributePaths = {"company", "diagnostic"})
    Optional<Lead> findWithDiagnosticById(UUID id);
}
