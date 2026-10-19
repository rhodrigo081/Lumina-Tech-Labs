package lumina.tech.labs.app.repository;


import lumina.tech.labs.app.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {

    /**
     * Companies are derived from the corporate email domain, so lookup
     * by domain is the primary access pattern (used to decide whether
     * to reuse an existing Company or create a new one for a Lead).
     */
    Optional<Company> findByEmailDomain(String emailDomain);

    boolean existsByEmailDomain(String emailDomain);
}