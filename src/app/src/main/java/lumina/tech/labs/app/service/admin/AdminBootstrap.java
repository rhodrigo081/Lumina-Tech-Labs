package lumina.tech.labs.app.service.admin;

import lumina.tech.labs.app.model.AdminUser;
import lumina.tech.labs.app.repository.AdminUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    private static final int MIN_PASSWORD_LENGTH = 10;

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final String name;

    public AdminBootstrap(AdminUserRepository adminUserRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${lumina.admin.bootstrap.email:}") String email,
                          @Value("${lumina.admin.bootstrap.password:}") String password,
                          @Value("${lumina.admin.bootstrap.name:Administrador}") String name) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
        this.name = name;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (adminUserRepository.count() > 0) {
            return;
        }
        if (email.isBlank() || password.isBlank()) {
            log.warn("No admin user exists. Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first one at startup.");
            return;
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            log.warn("ADMIN_PASSWORD must have at least {} characters; first admin NOT created.", MIN_PASSWORD_LENGTH);
            return;
        }
        try {
            adminUserRepository.saveAndFlush(AdminUser.builder()
                    .name(name)
                    .email(email.trim().toLowerCase())
                    .passwordHash(passwordEncoder.encode(password))
                    .build());
        } catch (DataIntegrityViolationException ex) {
            log.info("First admin user was created by another instance");
            return;
        }
        log.info("First admin user created for {}", email.trim().toLowerCase());
    }
}
