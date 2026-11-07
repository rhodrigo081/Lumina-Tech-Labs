package lumina.tech.labs.app.service;

import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lumina.tech.labs.app.dto.request.ContactRequest;
import lumina.tech.labs.app.dto.response.ContactReceiptResponse;
import lumina.tech.labs.app.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.Duration;
import java.time.ZoneId;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.*;

class ContactServiceTest {

    private final JavaMailSender mailSender = mock(JavaMailSender.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    @SuppressWarnings("unchecked")
    private final ValueOperations<String, String> ops = mock(ValueOperations.class);

    private final ContactRequest request = new ContactRequest("Ana Souza", "ana@gmail.com", "(81) 99999-0001",
            "ACME", "Proposta de automação", "Quero automatizar o escritório inteiro.");

    @BeforeEach
    void setUp() {
        given(mailSender.createMimeMessage()).willAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
        given(redis.opsForValue()).willReturn(ops);
    }

    private ContactService service(String recipient) {
        return new ContactService(mailSender, redis, "no-reply@lumina.tech", recipient, ZoneId.of("America/Sao_Paulo"), 15);
    }

    @Test
    void sendsTheFormToTheConfiguredInboxWithReplyToTheVisitor() throws Exception {
        ContactReceiptResponse receipt = service("contato@lumina.tech").send(request, null);

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(sent.capture());
        MimeMessage message = sent.getValue();
        assertThat(message.getAllRecipients()).extracting(Object::toString).containsExactly("contato@lumina.tech");
        assertThat(((InternetAddress) message.getReplyTo()[0]).getAddress()).isEqualTo("ana@gmail.com");
        assertThat(message.getSubject()).isEqualTo("[Contato #" + receipt.protocol() + "] Proposta de automação");
        assertThat((String) message.getContent())
                .contains("Nome: Ana Souza", "Empresa: ACME", "Assunto: Proposta de automação",
                        "Quero automatizar o escritório inteiro.");
        assertThat(receipt.protocol()).matches("\\d{8}-\\d{6}");
    }

    @Test
    void blankRecipientFallsBackToMailFrom() throws Exception {
        service("  ").send(request, null);

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(sent.capture());
        assertThat(sent.getValue().getAllRecipients()[0].toString()).isEqualTo("no-reply@lumina.tech");
    }

    @Test
    void deliveryFailureReturns503AndReleasesTheIdempotencyKey() {
        given(ops.setIfAbsent(anyString(), eq("PENDING"), any(Duration.class))).willReturn(true);
        willThrow(new MailSendException("smtp down")).given(mailSender).send(any(MimeMessage.class));

        assertThatThrownBy(() -> service("contato@lumina.tech").send(request, "key-1"))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getStatus().value()).isEqualTo(503));
        verify(redis).delete("idempotency:contact:key-1");
    }

    @Test
    void replayedKeyReturnsTheOriginalProtocolWithoutSendingAgain() {
        given(ops.setIfAbsent(anyString(), eq("PENDING"), any(Duration.class))).willReturn(false);
        given(ops.get("idempotency:contact:key-1")).willReturn("20261107-123456");

        assertThat(service("contato@lumina.tech").send(request, "key-1").protocol()).isEqualTo("20261107-123456");
        verify(mailSender, never()).send(any(MimeMessage.class));
    }
}
