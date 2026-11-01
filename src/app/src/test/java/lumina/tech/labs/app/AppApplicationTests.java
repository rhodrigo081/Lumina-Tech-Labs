package lumina.tech.labs.app;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/** Full context against real PostgreSQL + Redis (Testcontainers — requires Docker). */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {
		"JWT_SECRET=test-secret-with-at-least-32-bytes-for-hs256!",
		"CORS_ALLOWED_ORIGINS=http://localhost:4200",
		"MAIL_HOST=localhost",
		"MAIL_PORT=1025",
		"MAIL_USERNAME=",
		"MAIL_PASSWORD=",
		"MAIL_FROM=test@lumina.tech",
		"CRM_ACTIVE_PROVIDER=HUBSPOT",
		"REDIS_HOST=localhost",
		"REDIS_PORT=6379"
})
class AppApplicationTests {

	@Test
	void contextLoads() {
	}

}
