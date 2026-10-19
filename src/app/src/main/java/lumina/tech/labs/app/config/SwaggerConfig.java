package lumina.tech.labs.app.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI customOpenAPI() {

        return new OpenAPI().info(new Info().title("Lumina Tech Labs").version("1.0.0").description("A platform that helps Lumina Tech Labs capture and qualify B2B leads: visitors enter data about their corporate space, get an instant energy savings estimate, and can then schedule a diagnostic meeting with the sales team."));

    }
}
