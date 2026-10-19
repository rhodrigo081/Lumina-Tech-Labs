package lumina.tech.labs.app.listener;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.model.Schedule;
import lumina.tech.labs.app.event.ScheduleBookedEvent;
import lumina.tech.labs.app.repository.LeadRepository;
import lumina.tech.labs.app.repository.ScheduleRepository;
import lumina.tech.labs.app.service.NotificationService;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class ScheduleBookedEventListener {

    private final NotificationService notificationService;
    private final LeadRepository leadRepository;
    private final ScheduleRepository scheduleRepository;

    public ScheduleBookedEventListener(NotificationService notificationService,
                                        LeadRepository leadRepository,
                                        ScheduleRepository scheduleRepository) {
        this.notificationService = notificationService;
        this.leadRepository = leadRepository;
        this.scheduleRepository = scheduleRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onScheduleBooked(ScheduleBookedEvent event) {
        Lead lead = leadRepository.findById(event.leadId()).orElseThrow();
        Schedule schedule = scheduleRepository.findById(event.scheduleId()).orElseThrow();
        notificationService.notifyScheduleConfirmed(lead, schedule);
    }
}
