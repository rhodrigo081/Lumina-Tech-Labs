package lumina.tech.labs.app.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Backs the `Idempotency-Key` header on POST /api/v1/leads (design doc,
 * section 2 — Redis is used for "cache & idempotency"). Uses SETNX
 * semantics (`setIfAbsent`) so the reservation is atomic even under
 * concurrent duplicate submissions (double-click, retried request).
 */
@Service
public class IdempotencyService {

    private final StringRedisTemplate redisTemplate;
    private final Duration ttl;

    public IdempotencyService(StringRedisTemplate redisTemplate,
                               @Value("${lumina.idempotency.ttl-minutes:15}") long ttlMinutes) {
        this.redisTemplate = redisTemplate;
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }

    /** @return true if this key was NOT seen before (i.e. the caller may proceed). */
    public boolean reserve(String idempotencyKey) {
        Boolean firstSeen = redisTemplate.opsForValue()
                .setIfAbsent("idempotency:" + idempotencyKey, "processed", ttl);
        return Boolean.TRUE.equals(firstSeen);
    }
}
