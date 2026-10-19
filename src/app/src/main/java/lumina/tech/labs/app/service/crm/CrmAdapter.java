package lumina.tech.labs.app.service.crm;

import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.enums.CrmProvider;

/**
 * Adapter pattern (design doc, section 3): one implementation per CRM
 * (HubSpot/Salesforce/Pipefy/RD Station) behind a single contract, so
 * CrmSyncService never branches on provider-specific logic.
 */
public interface CrmAdapter {

    CrmProvider provider();

    /** Creates the lead + opportunity in the external CRM; returns its external id. */
    String sendLead(Lead lead);
}
