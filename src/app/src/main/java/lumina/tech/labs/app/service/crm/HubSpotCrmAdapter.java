package lumina.tech.labs.app.service.crm;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.enums.CrmProvider;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class HubSpotCrmAdapter implements CrmAdapter {

    @Override
    public CrmProvider provider() {
        return CrmProvider.HUBSPOT;
    }

    @Override
    public String sendLead(Lead lead) {
        return "hubspot-" + UUID.randomUUID();
    }
}
