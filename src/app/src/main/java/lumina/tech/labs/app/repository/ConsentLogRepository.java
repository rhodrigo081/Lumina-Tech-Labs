package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.model.ConsentLog;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.UUID;

public interface ConsentLogRepository extends Repository<ConsentLog, UUID> {

    List<ConsentLog> findByLeadIdOrderByAcceptedAtDesc(UUID leadId);
}
