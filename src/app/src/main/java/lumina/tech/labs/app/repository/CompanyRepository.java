package lumina.tech.labs.app.repository;


import lumina.tech.labs.app.model.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {

    /**
     * Leads with a corporate email are grouped by domain: the oldest Company
     * with that domain is reused. Never used for personal providers.
     */
    Optional<Company> findFirstByEmailDomainOrderByCreatedAtAsc(String emailDomain);
}