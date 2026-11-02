package lumina.tech.labs.app.service.crm;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.enums.CrmProvider;

public interface CrmAdapter {

    CrmProvider provider();

    String sendLead(Lead lead);
}
