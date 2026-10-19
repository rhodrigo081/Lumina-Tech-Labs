package lumina.tech.labs.app.exception;

/** Thrown when an Idempotency-Key was already processed (guards double form-submits). */
public class IdempotentReplayException extends RuntimeException {
    public IdempotentReplayException(String idempotencyKey) {
        super("Request with Idempotency-Key '" + idempotencyKey + "' was already processed");
    }
}
