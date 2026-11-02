package lumina.tech.labs.app.security;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
public class TokenRevocationService {

    private static final String PREFIX = "jwt:revoked:";

    private final StringRedisTemplate redis;

    public TokenRevocationService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void revoke(String jti, Instant expiresAt) {
        if (jti == null || expiresAt == null) {
            return;
        }
        Duration ttl = Duration.between(Instant.now(), expiresAt);
        if (!ttl.isNegative() && !ttl.isZero()) {
            redis.opsForValue().set(PREFIX + jti, "1", ttl);
        }
    }

    public boolean isRevoked(String jti) {
        return Boolean.TRUE.equals(redis.hasKey(PREFIX + jti));
    }
}
