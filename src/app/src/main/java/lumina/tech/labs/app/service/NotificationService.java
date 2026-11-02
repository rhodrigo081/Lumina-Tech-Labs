package lumina.tech.labs.app.service;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.model.Schedule;

public interface NotificationService {

    void notifyLeadQualified(Lead lead);

    void notifyScheduleConfirmed(Lead lead, Schedule schedule);

    void notifyScheduleCancelled(Lead lead, Schedule schedule);
}
