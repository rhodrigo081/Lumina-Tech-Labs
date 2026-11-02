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

    public static final class Reservation {
        private final AtomicReference<UUID> resourceId = new AtomicReference<>();

        public void complete(UUID id) {
            resourceId.set(id);
        }
    }
}
