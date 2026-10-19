package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.enums.Priority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeadRepository extends JpaRepository<Lead, UUID> {

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