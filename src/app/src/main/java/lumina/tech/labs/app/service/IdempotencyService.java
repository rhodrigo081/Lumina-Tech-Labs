package lumina.tech.labs.app.service;

import lumina.tech.labs.app.exception.ApiException;
import lumina.tech.labs.app.exception.IdempotentReplayException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Backs the `Idempotency-Key` header on POST /api/v1/leads (design doc,
 * section 2 — Redis is used for "cache & idempotency").
 *
 * Lifecycle of a key:
 *   1. {@link #begin} atomically reserves it as PENDING (SETNX), so concurrent
 *      duplicates (double click) are rejected with 409 REQUEST_IN_PROGRESS.
 *   2. When the surrounding transaction COMMITS, the key is overwritten with
 *      the id of the created resource, and later retries replay that result
 *      instead of failing.
 *   3. When the transaction ROLLS BACK (validation conflict, DB error...), the
 *      key is deleted, so a retry with the same key is processed normally —
 *      previously a failed request kept the key "used" for 15 minutes and the
 *      client's automatic retry got a misleading 409.
 */
@Service
public class IdempotencyService {

    private static final String PENDING = "PENDING";
    private static final int MAX_KEY_LENGTH = 100;

    private final StringRedisTemplate redisTemplate;
    private final Duration ttl;

    public IdempotencyService(StringRedisTemplate redisTemplate,
                               @Value("${lumina.idempotency.ttl-minutes:15}") long ttlMinutes) {
        this.redisTemplate = redisTemplate;
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }

    /**
     * Must be called inside an active transaction.
     *
     * @return the id of the already-created resource when this key completed before
     *         (caller must replay it), or a {@link Reservation} to report the new id into.
     */
    public Result begin(String scope, String idempotencyKey) {
        if (idempotencyKey.isBlank() || idempotencyKey.length() > MAX_KEY_LENGTH) {
            throw ApiException.badRequest("INVALID_IDEMPOTENCY_KEY",
                    "Idempotency-Key must have between 1 and " + MAX_KEY_LENGTH + " characters");
        }
        String redisKey = "idempotency:" + scope + ":" + idempotencyKey;

        Boolean reserved = redisTemplate.opsForValue().setIfAbsent(redisKey, PENDING, ttl);
        if (!Boolean.TRUE.equals(reserved)) {
            String value = redisTemplate.opsForValue().get(redisKey);
            if (value == null) {
                // Expired/deleted between the two calls: just try once more.
                return begin(scope, idempotencyKey);
            }
            if (PENDING.equals(value)) {
                throw new IdempotentReplayException(idempotencyKey);
            }
            return new Result(Optional.of(UUID.fromString(value)), null);
        }

        Reservation reservation = new Reservation();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                UUID id = reservation.resourceId.get();
                if (status == STATUS_COMMITTED && id != null) {
                    redisTemplate.opsForValue().set(redisKey, id.toString(), ttl);
                } else {
                    redisTemplate.delete(redisKey);
                }
            }
        });
        return new Result(Optional.empty(), reservation);
    }

    public record Result(Optional<UUID> completedResourceId, Reservation reservation) {
    }

    /** Handle used by the caller to report the id of the resource it created. */
    public static final class Reservation {
        private final AtomicReference<UUID> resourceId = new AtomicReference<>();

        public void complete(UUID id) {
            resourceId.set(id);
        }
    }
}
