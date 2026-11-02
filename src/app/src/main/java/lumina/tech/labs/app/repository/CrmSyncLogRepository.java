package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.model.CrmSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CrmSyncLogRepository extends JpaRepository<CrmSyncLog, UUID> {

    List<CrmSyncLog> findByLeadIdOrderBySyncedAtDesc(UUID leadId);
}
