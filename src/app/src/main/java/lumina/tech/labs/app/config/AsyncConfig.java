package lumina.tech.labs.app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Lets the AFTER_COMMIT listeners (email, Slack/Teams webhook, CRM, calendar)
 * run on Spring Boot's `applicationTaskExecutor` instead of the HTTP thread:
 * external latency no longer adds to the response time, and a failure there
 * can no longer turn an already-committed lead into an HTTP 500.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
