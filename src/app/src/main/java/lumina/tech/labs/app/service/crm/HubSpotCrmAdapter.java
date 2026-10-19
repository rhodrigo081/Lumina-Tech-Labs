package lumina.tech.labs.app.service.crm;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.enums.CrmProvider;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

/**
 * TODO: replace the body of sendLead() with a real HubSpot Deals/Contacts
 * API call (via RestClient/WebClient + API key from configuration).
 * Left as a stub so the Strategy/Adapter wiring in CrmSyncService is
 * demonstrable end-to-end without live HubSpot credentials.
 */
@Component
public class HubSpotCrmAdapter implements CrmAdapter {

    private final RestClient restClient = RestClient.create();

    @Override
    public CrmProvider provider() {
        return CrmProvider.HUBSPOT;
    }

    @Override
    public String sendLead(Lead lead) {
        // TODO: restClient.post().uri("https://api.hubapi.com/crm/v3/objects/contacts")...
        return "hubspot-" + UUID.randomUUID();
    }
}
