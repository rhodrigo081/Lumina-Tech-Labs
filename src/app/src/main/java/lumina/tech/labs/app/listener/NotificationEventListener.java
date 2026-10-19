package lumina.tech.labs.app.listener;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.event.LeadQualifiedEvent;
import lumina.tech.labs.app.repository.LeadRepository;
import lumina.tech.labs.app.service.NotificationService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * phase = AFTER_COMMIT: this only runs if LeadService.captureLead's
 * transaction actually committed — a rollback (e.g. a constraint violation)
 * never triggers an email to a lead that was not actually saved.
 *
 * NOTE: this is a lightweight, in-process approximation of the Outbox
 * pattern described in the design doc. It is synchronous with the HTTP
 * request thread's post-commit callback; for true durability against a
 * process crash between commit and listener execution, promote this to a
 * persisted outbox table polled by a separate worker.
 */
@Component
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final LeadRepository leadRepository;

    public NotificationEventListener(NotificationService notificationService, LeadRepository leadRepository) {
        this.notificationService = notificationService;
        this.leadRepository = leadRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLeadQualified(LeadQualifiedEvent event) {
        Lead lead = leadRepository.findById(event.leadId()).orElseThrow();
        notificationService.notifyLeadQualified(lead);
    }
}
