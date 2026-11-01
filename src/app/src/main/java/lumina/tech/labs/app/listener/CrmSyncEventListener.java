package lumina.tech.labs.app.listener;

import lumina.tech.labs.app.event.LeadQualifiedEvent;
import lumina.tech.labs.app.service.crm.CrmSyncService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Same AFTER_COMMIT + @Async guarantees as NotificationEventListener — see its Javadoc for the outbox caveat. */
@Component
public class CrmSyncEventListener {

    private final CrmSyncService crmSyncService;

    public CrmSyncEventListener(CrmSyncService crmSyncService) {
        this.crmSyncService = crmSyncService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLeadQualified(LeadQualifiedEvent event) {
        crmSyncService.syncLead(event.leadId());
    }
}
