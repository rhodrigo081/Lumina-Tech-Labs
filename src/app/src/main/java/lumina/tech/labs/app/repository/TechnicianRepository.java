package lumina.tech.labs.app.repository;

import lumina.tech.labs.app.model.Technician;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TechnicianRepository extends JpaRepository<Technician, UUID> {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);

    List<Technician> findAllByOrderByActiveDescNameAsc();

    long countByActiveTrue();
}
