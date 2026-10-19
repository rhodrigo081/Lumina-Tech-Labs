package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.model.CrmSyncLog;
import lumina.tech.labs.app.enums.CrmProvider;
import lumina.tech.labs.app.enums.SyncStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CrmSyncLogRepository extends JpaRepository<CrmSyncLog, UUID> {

    /** Full sync history for a Lead — may contain multiple rows (retries), unlike Diagnostic/Schedule. */
    List<CrmSyncLog> findByLeadIdOrderBySyncedAtDesc(UUID leadId);

    /** Used by the Outbox worker to pick up entries that still need to be retried. */
    List<CrmSyncLog> findBySyncStatus(SyncStatus syncStatus);

    /** Latest sync attempt for a given Lead + CRM provider pair. */
    Optional<CrmSyncLog> findFirstByLeadIdAndCrmProviderOrderBySyncedAtDesc(UUID leadId, CrmProvider crmProvider);
}