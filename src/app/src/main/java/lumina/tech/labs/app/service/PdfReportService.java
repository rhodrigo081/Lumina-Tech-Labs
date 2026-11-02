package lumina.tech.labs.app.service;

import lumina.tech.labs.app.model.Diagnostic;
import lumina.tech.labs.app.model.Lead;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class PdfReportService {

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    private static final Color PRIMARY = rgb(12, 50, 64);
    private static final Color PRIMARY_CONTAINER = rgb(38, 72, 87);
    private static final Color SECONDARY = rgb(74, 98, 107);
    private static final Color SECONDARY_FIXED_DIM = rgb(177, 202, 213);
    private static final Color TERTIARY = rgb(17, 51, 43);
    private static final Color TERTIARY_CONTAINER = rgb(41, 74, 65);
    private static final Color TERTIARY_SOFT = rgb(232, 247, 242);
    private static final Color ON_TERTIARY_FIXED_VARIANT = rgb(44, 77, 68);
    private static final Color SURFACE = rgb(255, 248, 245);
    private static final Color CARD = rgb(255, 255, 255);
    private static final Color CARD_LOW = rgb(255, 241, 234);
    private static final Color ON_SURFACE = rgb(34, 26, 21);
    private static final Color ON_SURFACE_VARIANT = rgb(66, 72, 75);
    private static final Color OUTLINE_VARIANT = rgb(193, 199, 203);

    private static final float PAGE_W = PDRectangle.A4.getWidth();
    private static final float PAGE_H = PDRectangle.A4.getHeight();
    private static final float MARGIN = 32;
    private static final float CONTENT_W = PAGE_W - 2 * MARGIN;

    private final LeadService leadService;
    private final DateTimeFormatter dateTimeFormat;
    private final byte[] regular = font("Regular");
    private final byte[] semiBold = font("SemiBold");
    private final byte[] bold = font("Bold");
    private final byte[] extraBold = font("ExtraBold");

    public PdfReportService(LeadService leadService, @Value("${lumina.scheduling.zone:America/Sao_Paulo}") ZoneId zone) {
        this.leadService = leadService;
        this.dateTimeFormat = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", PT_BR).withZone(zone);
    }

    public static String fileName(UUID leadId) {
        return "relatorio-lumina-" + shortId(leadId) + ".pdf";
    }

    @Transactional(readOnly = true)
    public byte[] buildPdfReport(UUID leadId) {
        Lead lead = leadService.getLeadOrThrow(leadId);
        try (PDDocument doc = new PDDocument()) {
            PDDocumentInformation info = doc.getDocumentInformation();
            info.setTitle("Relatório de Auditoria Energética #" + shortId(lead.getId()));
            info.setAuthor("Lumina Tech Labs");
            info.setSubject(lead.getCompany().getName());

            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                new Writer(doc, cs).draw(lead, lead.getDiagnostic());
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not build the PDF report for lead " + leadId, e);
        }
    }

    private final class Writer {

        private final PDPageContentStream cs;
        private final PDType0Font fRegular;
        private final PDType0Font fSemiBold;
        private final PDType0Font fBold;
        private final PDType0Font fExtraBold;
        private final Map<PDType0Font, Map<Integer, String>> glyphCache = new HashMap<>();
        private final NumberFormat money = NumberFormat.getCurrencyInstance(PT_BR);

        Writer(PDDocument doc, PDPageContentStream cs) throws IOException {
            this.cs = cs;
            this.fRegular = load(doc, regular);
            this.fSemiBold = load(doc, semiBold);
            this.fBold = load(doc, bold);
            this.fExtraBold = load(doc, extraBold);
        }

        void draw(Lead lead, Diagnostic d) throws IOException {
            BigDecimal annualSavings = d.getAnnualSavings();
            BigDecimal monthly = annualSavings.divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
            BigDecimal annualCost = d.getMonthlyEnergyBill().multiply(BigDecimal.valueOf(12));
            BigDecimal optimizedCost = annualCost.subtract(annualSavings);

            fill(SURFACE, 0, 0, PAGE_W, PAGE_H);

            float y = PAGE_H - MARGIN;
            float headerH = 118;
            roundRect(CARD, MARGIN, y - headerH, CONTENT_W, headerH, 12);
            float x = MARGIN + 18;
            text("RELATÓRIO OFICIAL #" + shortId(lead.getId()), fBold, 8.5f, PRIMARY, x, y - 26, 0.6f);
            text("Relatório de Auditoria Energética", fSemiBold, 20, PRIMARY, x, y - 50, 0);
            text(lead.getCompany().getName(), fSemiBold, 11, SECONDARY, x, y - 68, 0);

            float barY = y - headerH + 14;
            roundRect(CARD_LOW, x, barY, CONTENT_W - 36, 24, 8);
            List<String[]> params = new ArrayList<>(List.of(
                    new String[]{"Planta operacional: ", number(d.getAreaM2(), 2) + " m²"},
                    new String[]{"Estações de trabalho: ", String.valueOf(d.getWorkstations())},
                    new String[]{"Fatura mensal informada: ", currency(d.getMonthlyEnergyBill())}));
            if (d.getCalculatedAt() != null) {
                params.add(new String[]{"Calculado em: ", dateTimeFormat.format(d.getCalculatedAt())});
            }
            float paramGap = 12;
            float paramsW = 0;
            for (String[] p : params) {
                paramsW += width(p[0], fRegular, 8) + width(p[1], fSemiBold, 8) + paramGap;
            }
            float available = CONTENT_W - 36 - 20 + paramGap;
            float scale = Math.min(1f, available / paramsW);
            float paramSize = 8 * scale;
            float px = x + 10;
            for (String[] p : params) {
                px = text(p[0], fRegular, paramSize, ON_SURFACE_VARIANT, px, barY + 9, 0);
                px = text(p[1], fSemiBold, paramSize, ON_SURFACE, px, barY + 9, 0) + paramGap * scale;
            }

            y = y - headerH - 26;
            text("PAINEL EXECUTIVO", fBold, 8, SECONDARY, MARGIN, y, 1.2f);
            text("Indicadores de Desempenho e Impacto Financeiro", fBold, 15, PRIMARY, MARGIN, y - 20, 0);

            y -= 34;
            float gap = 10;
            float cardW = (CONTENT_W - gap) / 2;
            float cardH = 82;
            kpi(MARGIN, y - cardH, cardW, cardH, PRIMARY_CONTAINER, CARD, "REDUÇÃO PROJETADA", ON_SURFACE_VARIANT,
                    number(d.getConsumptionReductionPct(), 2) + "%", null, PRIMARY,
                    "Redução estimada no consumo de energia", ON_SURFACE_VARIANT);
            kpi(MARGIN + cardW + gap, y - cardH, cardW, cardH, PRIMARY, CARD, "ECONOMIA ANUAL", ON_SURFACE_VARIANT,
                    currency(annualSavings), null, PRIMARY,
                    "Equivale a " + currency(monthly) + "/mês", SECONDARY);
            y -= cardH + gap;
            kpi(MARGIN, y - cardH, cardW, cardH, SECONDARY_FIXED_DIM, CARD, "PAYBACK ESTIMADO", ON_SURFACE_VARIANT,
                    number(d.getPaybackMonths(), 1), "meses", PRIMARY,
                    "Tempo estimado para recuperar o investimento", ON_SURFACE_VARIANT);
            kpi(MARGIN + cardW + gap, y - cardH, cardW, cardH, TERTIARY_CONTAINER, TERTIARY_SOFT, "DESCARBONIZAÇÃO", TERTIARY,
                    number(d.getCo2ReductionTons(), 2), "tCO₂e/ano", TERTIARY,
                    "Emissões evitadas por ano", ON_TERTIARY_FIXED_VARIANT);
            y -= cardH + gap;

            float costH = 66;
            roundRect(CARD_LOW, MARGIN, y - costH, CONTENT_W, costH, 14);
            float colW = (CONTENT_W - 36) / 3;
            float cx = MARGIN + 14;
            text("CUSTO ANUAL ATUAL", fBold, 7.5f, ON_SURFACE_VARIANT, cx, y - 20, 0.6f);
            text(currency(annualCost), fBold, 14, ON_SURFACE, cx, y - 38, 0);
            text("12 × a fatura mensal informada", fRegular, 8, ON_SURFACE_VARIANT, cx, y - 52, 0);
            cx += colW;
            text("CUSTO ANUAL COM A SOLUÇÃO", fBold, 7.5f, TERTIARY, cx, y - 20, 0.6f);
            text(currency(optimizedCost), fBold, 14, PRIMARY, cx, y - 38, 0);
            text("Após a redução estimada", fRegular, 8, SECONDARY, cx, y - 52, 0);
            cx += colW;
            roundRect(CARD, cx, y - costH + 10, colW + 8, costH - 20, 10);
            text("ECONOMIA ANUAL ESTIMADA", fBold, 7.5f, ON_SURFACE_VARIANT, cx + 10, y - 26, 0.6f);
            text("+ " + currency(annualSavings), fBold, 13, PRIMARY, cx + 10, y - 44, 0);
            y -= costH + 16;

            drawAmortization(d, monthly, y);
        }

        private void drawAmortization(Diagnostic d, BigDecimal monthlyBd, float top) throws IOException {
            float h = top - MARGIN;
            roundRect(CARD, MARGIN, MARGIN, CONTENT_W, h, 16);
            float x = MARGIN + 18;
            float y = top - 22;
            text("RETORNO DO INVESTIMENTO", fBold, 8, SECONDARY, x, y, 1.2f);
            text("Curva de Amortização", fBold, 15, PRIMARY, x, y - 20, 0);
            String description = "Fluxo de caixa acumulado, calculado a partir da economia mensal e do payback estimados.";

            double monthly = monthlyBd.doubleValue();
            double payback = d.getPaybackMonths().doubleValue();
            if (!(monthly > 0) || !(payback > 0)) {
                text(description, fRegular, 8.5f, ON_SURFACE_VARIANT, x, y - 34, 0);
                roundRect(CARD_LOW, x, y - 80, CONTENT_W - 36, 30, 10);
                text("Para os parâmetros informados não há economia estimada, então não há curva de amortização para exibir.",
                        fRegular, 8.5f, ON_SURFACE_VARIANT, x + 10, y - 68, 0);
                return;
            }
            double invest = payback * monthly;
            int horizon = (int) Math.max(24, Math.ceil(payback) + 6);
            double end = monthly * horizon - invest;

            float boxW = 250;
            float boxX = MARGIN + CONTENT_W - 18 - boxW;
            roundRect(CARD_LOW, boxX, y - 44, boxW, 40, 10);
            text("INVESTIMENTO IMPLÍCITO", fBold, 7, ON_SURFACE_VARIANT, boxX + 10, y - 17, 0.4f);
            text(currency(invest), fBold, 11.5f, PRIMARY, boxX + 10, y - 34, 0);
            text("SALDO EM " + horizon + " MESES", fBold, 7, ON_SURFACE_VARIANT, boxX + 130, y - 17, 0.4f);
            text(currency(end), fBold, 11.5f, PRIMARY, boxX + 130, y - 34, 0);
            float lineY = y - 34;
            for (String line : wrap(description, fRegular, 8.5f, boxX - x - 14)) {
                text(line, fRegular, 8.5f, ON_SURFACE_VARIANT, x, lineY, 0);
                lineY -= 11;
            }

            float legendY = Math.min(y - 66, lineY - 6);
            circle(PRIMARY_CONTAINER, x + 4, legendY + 3, 4);
            text("Fluxo acumulado líquido", fRegular, 8, ON_SURFACE_VARIANT, x + 12, legendY, 0);
            String breakEven = "Equilíbrio em " + number(d.getPaybackMonths(), 1) + " meses";
            float beW = width(breakEven, fBold, 8);
            text(breakEven, fBold, 8, TERTIARY, MARGIN + CONTENT_W - 18 - beW, legendY, 0);

            float chartLeft = x;
            float chartRight = MARGIN + CONTENT_W - 18;
            float chartTop = legendY - 22;
            float chartBottom = MARGIN + 34;
            float chartW = chartRight - chartLeft;
            double min = -invest;
            double max = Math.max(end, 0);
            java.util.function.DoubleUnaryOperator yOf = v -> chartBottom + (v - min) / (max - min) * (chartTop - chartBottom);
            float zeroY = (float) yOf.applyAsDouble(0);
            float startY = (float) yOf.applyAsDouble(-invest);
            float endY = (float) yOf.applyAsDouble(end);
            float breakX = chartLeft + (float) (payback / horizon) * chartW;

            dashedLine(OUTLINE_VARIANT, 1.2f, chartLeft, zeroY, chartRight, zeroY, 4, 4);
            dashedLine(withAlpha(TERTIARY), 1.2f, breakX, chartBottom, breakX, chartTop, 2, 2);
            cs.setStrokingColor(PRIMARY);
            cs.setLineWidth(2.6f);
            cs.setLineCapStyle(1);
            cs.moveTo(chartLeft, startY);
            cs.lineTo(chartRight, endY);
            cs.stroke();
            circle(PRIMARY, chartLeft, startY, 4);
            circle(CARD, breakX, zeroY, 7.5f);
            circle(TERTIARY, breakX, zeroY, 6);
            circle(CARD, chartRight, endY, 5.5f);
            circle(PRIMARY, chartRight, endY, 4.5f);

            String startLabel = "Mês 0: " + currency(-invest);
            String endLabel = "Mês " + horizon + ": " + currency(end);
            text(startLabel, fRegular, 8, ON_SURFACE_VARIANT, chartLeft, MARGIN + 16, 0);
            text(endLabel, fRegular, 8, ON_SURFACE_VARIANT, chartRight - width(endLabel, fRegular, 8), MARGIN + 16, 0);
        }

        private void kpi(float x, float y, float w, float h, Color accent, Color bg, String label, Color labelColor,
                         String value, String unit, Color valueColor, String caption, Color captionColor) throws IOException {
            roundRect(bg, x, y, w, h, 12);
            cs.saveGraphicsState();
            roundRectPath(x, y, w, h, 12);
            cs.clip();
            fill(accent, x, y, 4.5f, h);
            cs.restoreGraphicsState();
            text(label, fBold, 7.5f, labelColor, x + 16, y + h - 20, 0.6f);
            float end = text(value, fExtraBold, 20, valueColor, x + 16, y + 26, 0);
            if (unit != null) {
                text(unit, fSemiBold, 10, valueColor == TERTIARY ? ON_TERTIARY_FIXED_VARIANT : SECONDARY, end + 5, y + 26, 0);
            }
            text(caption, fRegular, 8, captionColor, x + 16, y + 12, 0);
        }

        private float text(String s, PDType0Font font, float size, Color color, float x, float y, float tracking) throws IOException {
            String safe = printable(s, font);
            cs.beginText();
            cs.setFont(font, size);
            cs.setNonStrokingColor(color);
            cs.setCharacterSpacing(tracking);
            cs.newLineAtOffset(x, y);
            cs.showText(safe);
            cs.endText();
            cs.setCharacterSpacing(0);
            return x + width(safe, font, size) + tracking * safe.length();
        }

        private List<String> wrap(String s, PDType0Font font, float size, float maxWidth) throws IOException {
            List<String> lines = new ArrayList<>();
            StringBuilder line = new StringBuilder();
            for (String word : s.split(" ")) {
                String candidate = line.isEmpty() ? word : line + " " + word;
                if (!line.isEmpty() && width(candidate, font, size) > maxWidth) {
                    lines.add(line.toString());
                    line = new StringBuilder(word);
                } else {
                    line = new StringBuilder(candidate);
                }
            }
            if (!line.isEmpty()) {
                lines.add(line.toString());
            }
            return lines;
        }

        private float width(String s, PDType0Font font, float size) throws IOException {
            return font.getStringWidth(printable(s, font)) / 1000f * size;
        }

        private String printable(String s, PDType0Font font) {
            Map<Integer, String> cache = glyphCache.computeIfAbsent(font, k -> new HashMap<>());
            StringBuilder sb = new StringBuilder();
            s.codePoints().forEach(cp -> sb.append(cache.computeIfAbsent(cp, c -> {
                String ch = new String(Character.toChars(c));
                try {
                    font.encode(ch);
                    return ch;
                } catch (Exception e) {
                    return switch (c) {
                        case 0x2082 -> "2";
                        case 0x00A0, 0x202F -> " ";
                        case 0x2212 -> "-";
                        default -> "?";
                    };
                }
            })));
            return sb.toString();
        }

        private void fill(Color c, float x, float y, float w, float h) throws IOException {
            cs.setNonStrokingColor(c);
            cs.addRect(x, y, w, h);
            cs.fill();
        }

        private void roundRect(Color c, float x, float y, float w, float h, float r) throws IOException {
            cs.setNonStrokingColor(c);
            roundRectPath(x, y, w, h, r);
            cs.fill();
        }

        private void roundRectPath(float x, float y, float w, float h, float r) throws IOException {
            float k = 0.5523f * r;
            cs.moveTo(x + r, y);
            cs.lineTo(x + w - r, y);
            cs.curveTo(x + w - r + k, y, x + w, y + r - k, x + w, y + r);
            cs.lineTo(x + w, y + h - r);
            cs.curveTo(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h);
            cs.lineTo(x + r, y + h);
            cs.curveTo(x + r - k, y + h, x, y + h - r + k, x, y + h - r);
            cs.lineTo(x, y + r);
            cs.curveTo(x, y + r - k, x + r - k, y, x + r, y);
            cs.closePath();
        }

        private void circle(Color c, float cx, float cy, float r) throws IOException {
            roundRect(c, cx - r, cy - r, 2 * r, 2 * r, r);
        }

        private void dashedLine(Color c, float width, float x1, float y1, float x2, float y2, float on, float off) throws IOException {
            cs.saveGraphicsState();
            cs.setStrokingColor(c);
            cs.setLineWidth(width);
            cs.setLineDashPattern(new float[]{on, off}, 0);
            cs.moveTo(x1, y1);
            cs.lineTo(x2, y2);
            cs.stroke();
            cs.restoreGraphicsState();
        }

        private String currency(BigDecimal v) {
            return money.format(v);
        }

        private String currency(double v) {
            return money.format(v);
        }

        private String number(BigDecimal v, int decimals) {
            NumberFormat nf = NumberFormat.getNumberInstance(PT_BR);
            nf.setMinimumFractionDigits(decimals);
            nf.setMaximumFractionDigits(decimals);
            return nf.format(v);
        }
    }

    private static PDType0Font load(PDDocument doc, byte[] ttf) throws IOException {
        return PDType0Font.load(doc, new ByteArrayInputStream(ttf));
    }

    private static Color withAlpha(Color c) {
        return new Color((c.getRed() + 255) / 2, (c.getGreen() + 255) / 2, (c.getBlue() + 255) / 2);
    }

    private static String shortId(UUID id) {
        return id.toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private static Color rgb(int r, int g, int b) {
        return new Color(r, g, b);
    }

    private static byte[] font(String weight) {
        try (InputStream in = new ClassPathResource("fonts/PlusJakartaSans-" + weight + ".ttf").getInputStream()) {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Missing font " + weight, e);
        }
    }
}
