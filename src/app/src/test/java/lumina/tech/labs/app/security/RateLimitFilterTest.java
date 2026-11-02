package lumina.tech.labs.app.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class RateLimitFilterTest {

    static class FakeLimiter extends RateLimiter {
        final Map<String, Integer> counts = new HashMap<>();
        final List<String> blocked = new ArrayList<>();
        final List<String> calls = new ArrayList<>();
        boolean down;

        FakeLimiter() {
            super(mock(org.springframework.data.redis.core.StringRedisTemplate.class));
        }

        @Override
        public Decision hit(String rule, String client, int limit, Duration window, Duration block) {
            if (down) throw new IllegalStateException("redis down");
            String key = rule + ":" + client;
            calls.add(rule);
            if (blocked.contains(key)) return new Decision(false, false, block);
            int c = counts.merge(key, 1, Integer::sum);
            if (c <= limit) return Decision.ALLOW;
            if (!block.isZero()) blocked.add(key);
            return new Decision(false, c == limit + 1, block.isZero() ? window : block);
        }
    }

    private final FakeLimiter limiter = new FakeLimiter();
    private final RateLimitFilter filter = new RateLimitFilter(limiter);

    private MockHttpServletResponse send(String method, String uri, String ip) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(method, uri);
        req.setRemoteAddr(ip);
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res;
    }

    @Test
    void loginIsBlockedAfterTheLimitAndStaysBlocked() throws Exception {
        for (int i = 0; i < 10; i++) {
            assertThat(send("POST", "/api/v1/admin/auth/login", "1.2.3.4").getStatus()).isEqualTo(200);
        }
        MockHttpServletResponse blocked = send("POST", "/api/v1/admin/auth/login", "1.2.3.4");
        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getHeader("Retry-After")).isEqualTo(String.valueOf(Duration.ofMinutes(15).toSeconds()));
        assertThat(blocked.getContentAsString()).contains("\"code\":\"TOO_MANY_REQUESTS\"").doesNotContain("redis");

        assertThat(send("POST", "/api/v1/admin/auth/login", "1.2.3.4").getStatus()).isEqualTo(429);
        assertThat(send("POST", "/api/v1/admin/auth/login", "5.6.7.8").getStatus()).isEqualTo(200);
    }

    @Test
    void specificAndGlobalRulesBothApply() throws Exception {
        send("POST", "/api/v1/leads", "1.2.3.4");
        assertThat(limiter.calls).containsExactly("leads", "api");
    }

    @Test
    void nonApiPathsAndPreflightAreNotLimited() throws Exception {
        send("GET", "/actuator/health", "1.2.3.4");
        send("OPTIONS", "/api/v1/leads", "1.2.3.4");
        assertThat(limiter.calls).isEmpty();
    }

    @Test
    void redisOutageDoesNotTakeTheApiDown() throws Exception {
        limiter.down = true;
        assertThat(send("POST", "/api/v1/leads", "1.2.3.4").getStatus()).isEqualTo(200);
    }
}
