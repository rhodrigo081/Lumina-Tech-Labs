package lumina.tech.labs.app.service;

import lumina.tech.labs.app.enums.Priority;
import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.model.Schedule;
import lumina.tech.labs.app.model.Technician;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

@Service
public class EmailNotificationService implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);

    private final JavaMailSender mailSender;
    private final RestClient restClient;
    private final String salesWebhookUrl;
    private final String mailFrom;
    private final DateTimeFormatter meetingFormat;

    public EmailNotificationService(JavaMailSender mailSender,
                                    @Value("${lumina.notification.sales-webhook-url:}") String salesWebhookUrl,
                                    @Value("${lumina.notification.mail-from}") String mailFrom,
                                    @Value("${lumina.scheduling.zone:America/Sao_Paulo}") ZoneId zone) {
        this.mailSender = mailSender;
        this.restClient = RestClient.create();
        this.salesWebhookUrl = salesWebhookUrl;
        this.mailFrom = mailFrom;
        this.meetingFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm '(horário de Brasília)'", Locale.forLanguageTag("pt-BR"))
                .withZone(zone);
    }

    @Override
    public void notifyLeadQualified(Lead lead) {
        sendMail(lead.getCorporateEmail(), "Seu diagnóstico energético Lumina Tech Labs",
                "Olá, " + lead.getFullName() + ".\n\n"
                        + "Recebemos o seu diagnóstico. O relatório completo está disponível na página do diagnóstico, "
                        + "e você já pode agendar uma sessão técnica com a nossa equipe.\n\nLumina Tech Labs");

        if (lead.getPriority() == Priority.HIGH_PRIORITY) {
            notifySalesChannel(lead);
        }
    }

    @Override
    public void notifyScheduleConfirmed(Lead lead, Schedule schedule) {
        String when = meetingFormat.format(schedule.getMeetingTime());
        String link = schedule.getVideoLink() != null ? schedule.getVideoLink() : "enviado em breve";

        sendMail(lead.getCorporateEmail(), "Reunião de diagnóstico confirmada",
                "Olá, " + lead.getFullName() + ".\n\nSua reunião está confirmada para " + when + ".\n"
                        + "Técnico responsável: " + schedule.getSdrAssigned() + "\nLink da videochamada: " + link
                        + "\n\nLumina Tech Labs");

        Technician technician = schedule.getTechnician();
        if (technician != null) {
            sendMail(technician.getEmail(), "Nova reunião agendada: " + lead.getFullName(),
                    "Nova reunião de diagnóstico em " + when + ".\n\n"
                            + "Lead: " + lead.getFullName() + " — " + lead.getJobTitle() + "\n"
                            + "E-mail: " + lead.getCorporateEmail() + "\nTelefone: " + lead.getPhone() + "\n"
                            + "Prioridade: " + lead.getPriority() + "\nLink da videochamada: " + link);
        }
    }

    @Override
    public void notifyScheduleCancelled(Lead lead, Schedule schedule) {
        sendMail(lead.getCorporateEmail(), "Reunião de diagnóstico cancelada",
                "Olá, " + lead.getFullName() + ".\n\nA reunião marcada para " + meetingFormat.format(schedule.getMeetingTime())
                        + " foi cancelada pela nossa equipe. Você pode escolher um novo horário na página de agendamento.\n\nLumina Tech Labs");
    }

    private void notifySalesChannel(Lead lead) {
        if (salesWebhookUrl == null || salesWebhookUrl.isBlank()) {
            log.debug("Sales webhook not configured; skipping HIGH_PRIORITY alert for lead {}", lead.getId());
            return;
        }
        try {
            // Map body + explicit JSON content type: names with quotes no longer break the payload,
            // and toBodilessEntity() is what actually executes the request.
            restClient.post()
                    .uri(salesWebhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("text", "Novo lead HIGH_PRIORITY: " + lead.getFullName() + " (" + lead.getCorporateEmail() + ")"))
                    .retrieve()
                    .toBodilessEntity();
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
