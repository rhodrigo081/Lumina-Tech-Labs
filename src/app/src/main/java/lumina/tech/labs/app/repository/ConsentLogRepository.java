package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.model.ConsentLog;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * DESIGN INTENT — mirrors the append-only nature of the ConsentLog entity.
 *
 * This intentionally extends the plain marker interface `Repository<T, ID>`
 * instead of `JpaRepository`/`CrudRepository`, and declares ONLY the
 * methods below. There is no deleteById(), no delete(), no update-oriented
 * save() semantics exposed here — `save()` is kept purely for the initial
 * insert. This makes it a compile-time error for a future developer to call
 * `consentLogRepository.deleteById(...)` on legal evidence records, instead
 * of relying on a comment or a code-review convention.
 */
public interface ConsentLogRepository extends Repository<ConsentLog, UUID> {

    /** Only ever used for the initial insert — ConsentLog has no setters, so there is nothing to "update". */
    ConsentLog save(ConsentLog consentLog);

    Optional<ConsentLog> findById(UUID id);

    /** Full consent history for a Lead, most recent first (a Lead may re-accept an updated term version). */
    List<ConsentLog> findByLeadIdOrderByAcceptedAtDesc(UUID leadId);

    /** The term version currently in force for this Lead. */
    Optional<ConsentLog> findFirstByLeadIdOrderByAcceptedAtDesc(UUID leadId);
}