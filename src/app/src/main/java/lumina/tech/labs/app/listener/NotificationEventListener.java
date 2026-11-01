package lumina.tech.labs.app.listener;

import lumina.tech.labs.app.event.LeadQualifiedEvent;
import lumina.tech.labs.app.repository.LeadRepository;
import lumina.tech.labs.app.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * phase = AFTER_COMMIT: this only runs if LeadService.captureLead's
 * transaction actually committed — a rollback (e.g. a constraint violation)
 * never triggers an email to a lead that was not actually saved.
 *
 * @Async: runs off the request thread (see AsyncConfig).
 *
 * NOTE: still an in-process approximation of the Outbox pattern from the
 * design doc — a crash between commit and this listener loses the
 * notification. Promote to a persisted outbox table if that matters.
 */
@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final NotificationService notificationService;
    private final LeadRepository leadRepository;

    public NotificationEventListener(NotificationService notificationService, LeadRepository leadRepository) {
        this.notificationService = notificationService;
        this.leadRepository = leadRepository;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onLeadQualified(LeadQualifiedEvent event) {
        leadRepository.findById(event.leadId()).ifPresentOrElse(
                notificationService::notifyLeadQualified,
                () -> log.warn("Lead {} not found when sending the qualification notification", event.leadId()));
    }
}
