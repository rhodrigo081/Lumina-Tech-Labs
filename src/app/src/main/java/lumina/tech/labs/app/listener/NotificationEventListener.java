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
