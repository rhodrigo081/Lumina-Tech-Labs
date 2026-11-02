package lumina.tech.labs.app.listener;

import lumina.tech.labs.app.event.ScheduleBookedEvent;
import lumina.tech.labs.app.event.ScheduleCancelledEvent;
import lumina.tech.labs.app.service.ScheduleService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class ScheduleBookedEventListener {

    private final ScheduleService scheduleService;

    public ScheduleBookedEventListener(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
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
