package lumina.tech.labs.app.service;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.model.Schedule;
import lumina.tech.labs.app.enums.Priority;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class EmailNotificationService implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);

    private final JavaMailSender mailSender;
    private final RestClient restClient;
    private final String salesWebhookUrl;
    private final String mailFrom;

    public EmailNotificationService(JavaMailSender mailSender, @Value("${lumina.notification.sales-webhook-url}") String salesWebhookUrl, @Value("${lumina.notification.mail-from}") String mailFrom) {
        this.mailSender = mailSender;
        this.restClient = RestClient.create();
        this.salesWebhookUrl = salesWebhookUrl;
        this.mailFrom = mailFrom;
    }

    @Override
    public void notifyLeadQualified(Lead lead) {
        sendMail(lead.getCorporateEmail(), "Your energy savings diagnostic report", "Hi " + lead.getFullName() + ", your diagnostic report is attached/available at your dashboard.");

        if (lead.getPriority() == Priority.HIGH_PRIORITY) {
            notifySalesChannel(lead);
        }
    }

    @Override
    public void notifyScheduleConfirmed(Lead lead, Schedule schedule) {
        sendMail(lead.getCorporateEmail(), "Your diagnostic meeting is confirmed", "Meeting scheduled for " + schedule.getMeetingTime() + ". Join here: " + schedule.getVideoLink());

        // The consultant's own address is looked up from the SDR directory in a real deployment;
        // routing that lookup is out of scope for this stub.
        log.info("Notifying SDR {} about the new booking with lead {}", schedule.getSdrAssigned(), lead.getId());
    }

    private void notifySalesChannel(Lead lead) {
        try {
            restClient.post().uri(salesWebhookUrl).body("{\"text\":\"New HIGH_PRIORITY lead: " + lead.getFullName() + " (" + lead.getCorporateEmail() + ")\"}").retrieve();
        } catch (Exception ex) {
            log.warn("Failed to notify sales channel for lead {}: {}", lead.getId(), ex.getMessage());
            // Never propagate — a Slack/Teams outage must not fail lead capture (NFR3.2).
        }
    }

    private void sendMail(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Failed to send email to {}: {}", to, ex.getMessage());
        }
    }
}
