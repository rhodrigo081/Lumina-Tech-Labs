package lumina.tech.labs.app.service.admin;

import lumina.tech.labs.app.config.SecurityConfig;
import lumina.tech.labs.app.dto.admin.AdminLoginRequest;
import lumina.tech.labs.app.dto.admin.AdminProfileResponse;
import lumina.tech.labs.app.dto.admin.AdminTokenResponse;
import lumina.tech.labs.app.exception.ApiException;
import lumina.tech.labs.app.model.AdminUser;
import lumina.tech.labs.app.repository.AdminUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Email + password login for the admin area. Issues a short-lived HS256 JWT.
 * Failed attempts are counted per email in Redis: after MAX_FAILED_ATTEMPTS
 * the account is locked for LOCK_DURATION (429) to slow down brute force.
 */
@Service
public class AdminAuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final StringRedisTemplate redisTemplate;
    private final Duration tokenTtl;
    /** Hash compared when the email does not exist, so response time does not reveal valid emails. */
    private final String dummyHash;

    public AdminAuthService(AdminUserRepository adminUserRepository,
                            PasswordEncoder passwordEncoder,
                            JwtEncoder jwtEncoder,
                            StringRedisTemplate redisTemplate,
                            @Value("${lumina.security.jwt.ttl-minutes:480}") long ttlMinutes) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.redisTemplate = redisTemplate;
        this.tokenTtl = Duration.ofMinutes(ttlMinutes);
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public AdminTokenResponse login(AdminLoginRequest request) {
        String email = request.email().trim().toLowerCase();
        String failKey = "admin:login:fail:" + email;

        String failures = redisTemplate.opsForValue().get(failKey);
        if (failures != null && Integer.parseInt(failures) >= MAX_FAILED_ATTEMPTS) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS",
                    "Too many failed attempts. Try again in a few minutes.");
        }

        Optional<AdminUser> found = adminUserRepository.findByEmailIgnoreCase(email);
        boolean passwordOk = passwordEncoder.matches(request.password(),
                found.map(AdminUser::getPasswordHash).orElse(dummyHash));
        if (found.isEmpty() || !passwordOk || !found.get().isActive()) {
            Long count = redisTemplate.opsForValue().increment(failKey);
            if (count != null && count == 1) {
                redisTemplate.expire(failKey, LOCK_DURATION);
            }
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password");
        }
        redisTemplate.delete(failKey);

        AdminUser admin = found.get();
        admin.setLastLoginAt(Instant.now());

        Instant now = Instant.now();
        Instant expiresAt = now.plus(tokenTtl);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(SecurityConfig.ISSUER)
                .subject(admin.getId().toString())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("email", admin.getEmail())
                .claim("name", admin.getName())
                .claim("roles", List.of("ADMIN"))
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

        return new AdminTokenResponse(token, "Bearer", expiresAt, toProfile(admin));
    }

    @Transactional(readOnly = true)
    public AdminProfileResponse profile(UUID adminId) {
        AdminUser admin = adminUserRepository.findById(adminId)
                .filter(AdminUser::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Admin not found or inactive"));
        return toProfile(admin);
    }

    private static AdminProfileResponse toProfile(AdminUser admin) {
        return new AdminProfileResponse(admin.getId(), admin.getName(), admin.getEmail());
    }
}
