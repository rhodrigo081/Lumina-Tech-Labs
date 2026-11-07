package lumina.tech.labs.app.listener;

import lumina.tech.labs.app.event.LeadQualifiedEvent;
import lumina.tech.labs.app.event.ScheduleBookedEvent;
import lumina.tech.labs.app.event.ScheduleCancelledEvent;
import lumina.tech.labs.app.repository.LeadRepository;
import lumina.tech.labs.app.service.NotificationService;
import lumina.tech.labs.app.service.ScheduleService;
import lumina.tech.labs.app.service.crm.CrmSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Runs the slow side effects (CRM, e-mail, meeting room) after the originating transaction commits,
 * each on its own async task so one failing integration never blocks the others.
 */
@Component
public class DomainEventListener {

    private static final Logger log = LoggerFactory.getLogger(DomainEventListener.class);

    private final CrmSyncService crmSyncService;
    private final NotificationService notificationService;
    private final ScheduleService scheduleService;
    private final LeadRepository leadRepository;

    public DomainEventListener(CrmSyncService crmSyncService, NotificationService notificationService,
                               ScheduleService scheduleService, LeadRepository leadRepository) {
        this.crmSyncService = crmSyncService;
        this.notificationService = notificationService;
        this.scheduleService = scheduleService;
        this.leadRepository = leadRepository;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void syncLeadToCrm(LeadQualifiedEvent event) {
        crmSyncService.syncLead(event.leadId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void notifyLeadQualified(LeadQualifiedEvent event) {
        leadRepository.findById(event.leadId()).ifPresentOrElse(
                notificationService::notifyLeadQualified,
                () -> log.warn("Lead {} not found when sending the qualification notification", event.leadId()));
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onScheduleBooked(ScheduleBookedEvent event) {
        scheduleService.handleBooked(event.scheduleId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onScheduleCancelled(ScheduleCancelledEvent event) {
        scheduleService.handleCancelled(event.scheduleId());
    }
}
