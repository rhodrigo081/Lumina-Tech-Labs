package lumina.tech.labs.app.exception;

import org.springframework.http.HttpStatus;

/**
 * The same Idempotency-Key is still being processed by another request
 * (e.g. double click). Completed keys never raise this: they replay the
 * original response instead (see IdempotencyService).
 */
public class IdempotentReplayException extends ApiException {
    public IdempotentReplayException(String idempotencyKey) {
        super(HttpStatus.CONFLICT, "REQUEST_IN_PROGRESS",
                "Request with Idempotency-Key '" + idempotencyKey + "' is still being processed");
    }
}
