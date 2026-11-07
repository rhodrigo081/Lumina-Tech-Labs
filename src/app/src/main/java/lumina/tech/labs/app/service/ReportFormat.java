package lumina.tech.labs.app.service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

/** Brazilian formatting shared by the text report, the PDF report and the e-mails. */
final class ReportFormat {

    static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    private ReportFormat() {
    }

    static DateTimeFormatter dateTime(ZoneId zone) {
        return DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", PT_BR).withZone(zone);
    }

    static String currency(Number value) {
        return NumberFormat.getCurrencyInstance(PT_BR).format(value);
    }

    /** Formats with between {@code minDecimals} and {@code maxDecimals} fraction digits. */
    static String number(BigDecimal value, int minDecimals, int maxDecimals) {
        NumberFormat format = NumberFormat.getNumberInstance(PT_BR);
        format.setMinimumFractionDigits(minDecimals);
        format.setMaximumFractionDigits(maxDecimals);
        return format.format(value);
    }

    static String shortId(UUID id) {
        return id.toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }
}
