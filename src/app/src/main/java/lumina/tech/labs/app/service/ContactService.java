package lumina.tech.labs.app.service;

import jakarta.mail.internet.MimeMessage;
import lumina.tech.labs.app.dto.request.ContactRequest;
import lumina.tech.labs.app.dto.response.ContactReceiptResponse;
import lumina.tech.labs.app.exception.ApiException;
import lumina.tech.labs.app.exception.IdempotentReplayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Delivers the public contact form to the team inbox ({@code lumina.contact.recipient}).
 * The email is sent synchronously so the visitor knows whether the message really left;
 * on failure the frontend offers WhatsApp as a fallback.
 */
@Service
public class ContactService {

    private static final Logger log = LoggerFactory.getLogger(ContactService.class);
    private static final String PENDING = "PENDING";
    private static final int MAX_KEY_LENGTH = 100;
    private static final DateTimeFormatter PROTOCOL_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JavaMailSender mailSender;
    private final StringRedisTemplate redisTemplate;
    private final String mailFrom;
    private final String recipient;
    private final ZoneId zone;
    private final Duration idempotencyTtl;

    public ContactService(JavaMailSender mailSender,
                          StringRedisTemplate redisTemplate,
                          @Value("${lumina.notification.mail-from}") String mailFrom,
                          @Value("${lumina.contact.recipient:}") String recipient,
                          @Value("${lumina.scheduling.zone:America/Sao_Paulo}") ZoneId zone,
                          @Value("${lumina.idempotency.ttl-minutes:15}") long ttlMinutes) {
        this.mailSender = mailSender;
        this.redisTemplate = redisTemplate;
        this.mailFrom = mailFrom;
        this.recipient = recipient == null || recipient.isBlank() ? mailFrom : recipient.trim();
        this.zone = zone;
        this.idempotencyTtl = Duration.ofMinutes(ttlMinutes);
    }

    public ContactReceiptResponse send(ContactRequest request, String idempotencyKey) {
        String redisKey = reserve(idempotencyKey);
        if (redisKey != null) {
            String previous = redisTemplate.opsForValue().get(redisKey);
            if (previous != null && !PENDING.equals(previous)) {
                return new ContactReceiptResponse(previous);
            }
        }

        String protocol = newProtocol();
        try {
            mailSender.send(buildMessage(request, protocol));
        } catch (Exception ex) {
            if (redisKey != null) {
                redisTemplate.delete(redisKey);
            }
            log.error("Failed to deliver contact message {} to the team inbox: {}", protocol, ex.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "CONTACT_DELIVERY_FAILED",
                    "Could not send the message right now. Try again later.");
        }
        if (redisKey != null) {
            redisTemplate.opsForValue().set(redisKey, protocol, idempotencyTtl);
        }
        log.info("Contact message {} delivered to the team inbox", protocol);
        return new ContactReceiptResponse(protocol);
    }

    /** Returns the Redis key when the request is new or already completed; throws while another copy is in flight. */
    private String reserve(String idempotencyKey) {
        if (idempotencyKey == null) {
            return null;
        }
        if (idempotencyKey.isBlank() || idempotencyKey.length() > MAX_KEY_LENGTH) {
            throw ApiException.badRequest("INVALID_IDEMPOTENCY_KEY",
                    "Idempotency-Key must have between 1 and " + MAX_KEY_LENGTH + " characters");
        }
        String redisKey = "idempotency:contact:" + idempotencyKey;
        if (Boolean.TRUE.equals(redisTemplate.opsForValue().setIfAbsent(redisKey, PENDING, idempotencyTtl))) {
            return redisKey;
        }
        if (PENDING.equals(redisTemplate.opsForValue().get(redisKey))) {
            throw new IdempotentReplayException(idempotencyKey);
        }
        return redisKey;
    }

    private MimeMessage buildMessage(ContactRequest request, String protocol) throws Exception {
        String name = request.name().trim();
        String email = request.email().trim();
        String company = request.company() == null || request.company().isBlank() ? "Não informada" : request.company().trim();
        String subject = request.subject().trim();

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
        helper.setFrom(mailFrom);
        helper.setTo(recipient);
        helper.setReplyTo(email, name);
        helper.setSubject("[Contato #" + protocol + "] " + subject);
        helper.setText("Nova mensagem recebida pelo formulário de contato do site.\n\n"
                + "Protocolo: #" + protocol + "\n"
                + "Nome: " + name + "\n"
                + "Empresa: " + company + "\n"
                + "E-mail: " + email + "\n"
                + "Telefone: " + request.phone().trim() + "\n"
                + "Assunto: " + subject + "\n\n"
                + "Mensagem:\n" + request.message().trim() + "\n\n"
                + "Responda este e-mail para falar diretamente com " + name + ".");
        return message;
    }

    private String newProtocol() {
        return LocalDate.now(zone).format(PROTOCOL_DATE) + "-" + String.format("%06d", RANDOM.nextInt(1_000_000));
    }
}
