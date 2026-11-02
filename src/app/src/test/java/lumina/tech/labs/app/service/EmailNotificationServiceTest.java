package lumina.tech.labs.app.service;

import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import lumina.tech.labs.app.enums.Priority;
import lumina.tech.labs.app.model.Lead;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

import java.io.ByteArrayOutputStream;
import java.time.ZoneId;
import java.util.Properties;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class EmailNotificationServiceTest {

    @Test
    void qualifiedLeadReceivesThePdfReportAsAttachment() throws Exception {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        PdfReportService pdfReportService = mock(PdfReportService.class);
        given(mailSender.createMimeMessage()).willAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
        Lead lead = Lead.builder().id(UUID.randomUUID()).fullName("Ana Souza")
                .corporateEmail("ana@empresa.com.br").priority(Priority.LOW_PRIORITY).build();
        byte[] pdf = "%PDF-1.7 teste".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        given(pdfReportService.buildPdfReport(lead.getId())).willReturn(pdf);

        new EmailNotificationService(mailSender, pdfReportService, "", "no-reply@lumina.tech", ZoneId.of("America/Sao_Paulo"))
                .notifyLeadQualified(lead);

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(sent.capture());
        MimeMessage message = sent.getValue();
        message.saveChanges();
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("ana@empresa.com.br");

        Multipart parts = (Multipart) message.getContent();
        String body = null;
        byte[] attachment = null;
        String contentType = null;
        String fileName = null;
        for (int i = 0; i < parts.getCount(); i++) {
            Part part = parts.getBodyPart(i);
            if (Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition())) {
                fileName = part.getFileName();
                contentType = part.getContentType();
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                part.getDataHandler().writeTo(out);
                attachment = out.toByteArray();
            } else {
                body = textOf(part);
            }
        }
        assertThat(body).contains("Olá, Ana Souza.").contains("Recebemos o seu diagnóstico.");
        assertThat(fileName).isEqualTo(PdfReportService.fileName(lead.getId()));
        assertThat(contentType).startsWith("application/pdf");
        assertThat(attachment).isEqualTo(pdf);
    }

    private static String textOf(Part part) throws Exception {
        Object content = part.getContent();
        if (content instanceof String s) {
            return s;
        }
        Multipart nested = (Multipart) content;
        return textOf(nested.getBodyPart(0));
    }
}
