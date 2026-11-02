package lumina.tech.labs.app.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lumina.tech.labs.app.config.RequestIdFilter;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.time.Instant;

public final class ErrorResponses {

    private ErrorResponses() {
    }

    public static void write(HttpServletRequest req, HttpServletResponse res, HttpStatus status, String code,
                             String message) throws IOException {
        if (res.isCommitted()) {
            return;
        }
        res.setStatus(status.value());
        res.setContentType("application/json");
        res.setCharacterEncoding("UTF-8");
        String traceId = RequestIdFilter.current(req);
        res.getWriter().write("{\"timestamp\":\"" + Instant.now() + "\",\"status\":" + status.value()
                + ",\"error\":\"" + json(status.getReasonPhrase()) + "\",\"code\":\"" + json(code)
                + "\",\"message\":\"" + json(message) + "\",\"path\":\"" + json(req.getRequestURI())
                + "\",\"fieldErrors\":null,\"traceId\":" + (traceId == null ? "null" : "\"" + json(traceId) + "\"") + "}");
    }

    static String json(String value) {
        StringBuilder sb = new StringBuilder(value.length() + 8);
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        return sb.toString();
    }
}
