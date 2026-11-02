package lumina.tech.labs.app.exception;

import org.springframework.http.HttpStatus;

public class IdempotentReplayException extends ApiException {
    public IdempotentReplayException(String idempotencyKey) {
        super(HttpStatus.CONFLICT, "REQUEST_IN_PROGRESS",
                "Request with Idempotency-Key '" + idempotencyKey + "' is still being processed");
    }
}
