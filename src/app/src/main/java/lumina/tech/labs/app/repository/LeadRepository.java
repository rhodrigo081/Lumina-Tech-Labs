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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeadRepository extends JpaRepository<Lead, UUID>, JpaSpecificationExecutor<Lead> {

    /**
     * Admin listing. The fetch graph avoids N+1: the inverse-side @OneToOne
     * associations (diagnostic, schedule) cannot really be lazy without
     * bytecode enhancement, so without this each row triggered extra queries.
     */
    @Override
    @EntityGraph(attributePaths = {"company", "diagnostic", "schedule", "schedule.technician"})
    Page<Lead> findAll(Specification<Lead> spec, Pageable pageable);

    /** Admin detail page: everything except the 1:N logs (loaded separately). */
    @EntityGraph(attributePaths = {"company", "diagnostic", "schedule", "schedule.technician"})
    Optional<Lead> findDetailedById(UUID id);

    long countByCreatedAtAfter(Instant after);

    long countByPriority(Priority priority);

    /** Deduplication check before inserting a new Lead (unique constraint on corporate_email). */
    Optional<Lead> findByCorporateEmail(String corporateEmail);

    boolean existsByCorporateEmail(String corporateEmail);

    /** All leads belonging to the same Company (1:N — inverse side lookup). */
    List<Lead> findByCompanyId(UUID companyId);

    /** Used by Inside Sales dashboards / routing to filter HIGH_PRIORITY leads. */
    Page<Lead> findByPriority(Priority priority, Pageable pageable);

    /**
     * Eagerly fetches the lazy `company` and `diagnostic` associations in a
     * single query (avoids N+1 when the API response — LeadResponse — needs
     * both companyName and the diagnostic block). `schedule` is intentionally
     * NOT included here since not every read path needs it; add a dedicated
     * @EntityGraph if a use case requires it too.
     */
    @EntityGraph(attributePaths = {"company", "diagnostic"})
    Optional<Lead> findWithDiagnosticById(UUID id);
}