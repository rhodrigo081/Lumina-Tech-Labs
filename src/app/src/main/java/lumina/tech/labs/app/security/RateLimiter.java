package lumina.tech.labs.app.security;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

@Component
public class RateLimiter {

    public record Decision(boolean allowed, boolean newlyBlocked, Duration retryAfter) {
        public static final Decision ALLOW = new Decision(true, false, Duration.ZERO);
    }

    private static final DefaultRedisScript<List> SCRIPT = new DefaultRedisScript<>("""
            local blocked = redis.call('PTTL', KEYS[2])
            if blocked > 0 then return {0, blocked} end
            local c = redis.call('INCR', KEYS[1])
            if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
            if c > tonumber(ARGV[2]) then
              local block = tonumber(ARGV[3])
              if block > 0 then
                redis.call('SET', KEYS[2], '1', 'PX', block)
                return {2, block}
              end
              local ttl = redis.call('PTTL', KEYS[1])
              if c == tonumber(ARGV[2]) + 1 then return {2, ttl} end
              return {0, ttl}
            end
            return {1, 0}
            """, List.class);

    private final StringRedisTemplate redis;

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public Decision hit(String rule, String client, int limit, Duration window, Duration block) {
        String base = "ratelimit:" + rule + ":" + client;
        List<?> result = redis.execute(SCRIPT, List.of(base, base + ":blocked"),
                String.valueOf(window.toMillis()), String.valueOf(limit), String.valueOf(block.toMillis()));
        if (result == null || result.size() < 2) {
            return Decision.ALLOW;
        }
        long status = ((Number) result.get(0)).longValue();
        long ttlMs = Math.max(((Number) result.get(1)).longValue(), 1000);
        return status == 1 ? Decision.ALLOW : new Decision(false, status == 2, Duration.ofMillis(ttlMs));
    }
}
