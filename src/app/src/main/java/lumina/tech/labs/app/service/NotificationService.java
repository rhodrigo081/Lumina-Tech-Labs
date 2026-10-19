package lumina.tech.labs.app.service;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.model.Schedule;

public interface NotificationService {

    /** FR03.3 — sends the diagnostic report to the lead and alerts the sales channel if HIGH_PRIORITY. */
    void notifyLeadQualified(Lead lead);

    /** FR02.3 — sends the meeting invite to both the lead and the assigned consultant. */
    void notifyScheduleConfirmed(Lead lead, Schedule schedule);
}
