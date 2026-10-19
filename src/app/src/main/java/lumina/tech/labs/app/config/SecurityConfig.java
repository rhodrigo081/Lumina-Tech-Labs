package lumina.tech.labs.app.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * No authentication in this application today — every endpoint is part of
 * the public B2B capture funnel (RF01-RF03), used by anonymous visitors
 * with no account. This class exists only to wire CORS (see CorsConfig)
 * and keep the API stateless.
 *
 * There is currently no requirement anywhere in the spec for a login or
 * an internal/admin area. If one shows up later (e.g. an SDR dashboard),
 * re-introduce authentication then — against a concrete, real endpoint —
 * rather than keeping unused auth machinery around now.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> {}) // delegates to the CorsConfigurationSource bean in CorsConfig
                .csrf(csrf -> csrf.disable()) // stateless JSON API, no cookie-based auth
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }
}
