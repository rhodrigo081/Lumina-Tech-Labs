package lumina.tech.labs.app.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lumina.tech.labs.app.exception.ErrorResponses;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@ConditionalOnProperty(name = "lumina.rate-limit.enabled", havingValue = "true", matchIfMissing = true)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    record Rule(String name, String method, Pattern path, int limit, Duration window, Duration block) {
        boolean matches(HttpServletRequest req) {
            return (method == null || method.equalsIgnoreCase(req.getMethod())) && path.matcher(req.getRequestURI()).matches();
        }
    }

    static final List<Rule> RULES = List.of(
            new Rule("login", "POST", Pattern.compile("^/api/v1/admin/auth/login/?$"), 10, Duration.ofMinutes(5), Duration.ofMinutes(15)),
            new Rule("leads", "POST", Pattern.compile("^/api/v1/leads/?$"), 10, Duration.ofMinutes(10), Duration.ofMinutes(30)),
            new Rule("contact", "POST", Pattern.compile("^/api/v1/contact/?$"), 5, Duration.ofMinutes(10), Duration.ofMinutes(30)),
            new Rule("book", "POST", Pattern.compile("^/api/v1/schedule/book/?$"), 10, Duration.ofMinutes(10), Duration.ofMinutes(30)),
            new Rule("preview", "POST", Pattern.compile("^/api/v1/diagnostics/preview/?$"), 90, Duration.ofMinutes(1), Duration.ZERO),
            new Rule("report", "GET", Pattern.compile("^/api/v1/leads/[^/]+/report/?$"), 30, Duration.ofMinutes(1), Duration.ofMinutes(10)),
            new Rule("api", null, Pattern.compile("^/api/.*"), 300, Duration.ofMinutes(1), Duration.ofMinutes(5))
    );

    private final RateLimiter limiter;

    public RateLimitFilter(RateLimiter limiter) {
        this.limiter = limiter;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equalsIgnoreCase(request.getMethod()) || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String ip = request.getRemoteAddr();
        for (Rule rule : RULES) {
            if (!rule.matches(request)) {
                continue;
            }
            RateLimiter.Decision decision;
            try {
                decision = limiter.hit(rule.name(), ip, rule.limit(), rule.window(), rule.block());
            } catch (RuntimeException ex) {
                log.warn("Rate limiter unavailable, request not limited: {}", ex.getMessage());
                break;
            }
            if (!decision.allowed()) {
                if (decision.newlyBlocked()) {
                    log.warn("Rate limit '{}' exceeded by {} ({} {}); blocked for {}s",
                            rule.name(), ip, request.getMethod(), request.getRequestURI(), decision.retryAfter().toSeconds());
                }
                response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(Math.max(1, decision.retryAfter().toSeconds())));
                ErrorResponses.write(request, response, HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS",
                        "Too many requests. Try again later.");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
