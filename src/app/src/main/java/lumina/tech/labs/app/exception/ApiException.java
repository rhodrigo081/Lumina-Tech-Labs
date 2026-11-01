package lumina.tech.labs.app.exception;

import org.springframework.http.HttpStatus;

/**
 * Base for every business error the API reports on purpose. Carries the
 * HTTP status and a stable machine-readable `code` (e.g. SLOT_UNAVAILABLE)
 * that the frontend uses to pick the right message — two different 409s
 * are no longer indistinguishable.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    public static ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }
}
