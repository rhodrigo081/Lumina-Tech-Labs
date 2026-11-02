package lumina.tech.labs.app.exception;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        List<FieldError> fieldErrors,
        String traceId
) {
    public record FieldError(String field, String message) {
    }
}
