package lumina.tech.labs.app;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

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
		"REDIS_PORT=6379",
		"REDIS_PASSWORD=",
		"MAIL_STARTTLS_REQUIRED=false",
		"JWT_TTL_MINUTES=120",
		"ADMIN_EMAIL=",
		"ADMIN_PASSWORD=",
		"ADMIN_NAME=Administrador",
		"GOOGLE_CLIENT_ID=test-client",
		"GOOGLE_CLIENT_SECRET=test-secret",
		"GOOGLE_REFRESH_TOKEN=test-refresh-token",
		"GOOGLE_CALENDAR_ID=primary",
		"SALES_WEBHOOK_URL=",
		"API_DOCS_ENABLED=false",
		"RATE_LIMIT_ENABLED=true"
})
class AppApplicationTests {

	@Test
	void contextLoads() {
	}
}
