package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.model.Diagnostic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DiagnosticRepository extends JpaRepository<Diagnostic, UUID> {

    /**
     * The natural finder for a 1:1 relationship: since `lead_id` is UNIQUE
     * on this table, this always returns at most one row per Lead — mirrors
     * Lead.getDiagnostic() without needing to load the Lead first.
     */
    Optional<Diagnostic> findByLeadId(UUID leadId);

    boolean existsByLeadId(UUID leadId);
}