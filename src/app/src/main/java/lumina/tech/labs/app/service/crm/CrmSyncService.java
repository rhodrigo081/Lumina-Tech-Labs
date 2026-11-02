package lumina.tech.labs.app.service.crm;

import lumina.tech.labs.app.model.CrmSyncLog;
import lumina.tech.labs.app.model.Lead;
import lumina.tech.labs.app.enums.CrmProvider;
import lumina.tech.labs.app.enums.SyncStatus;
import lumina.tech.labs.app.exception.LeadNotFoundException;
import lumina.tech.labs.app.repository.CrmSyncLogRepository;
import lumina.tech.labs.app.repository.LeadRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CrmSyncService {

    private static final Logger log = LoggerFactory.getLogger(CrmSyncService.class);

    private final Map<CrmProvider, CrmAdapter> adaptersByProvider;
    private final CrmSyncLogRepository crmSyncLogRepository;
    private final LeadRepository leadRepository;
    private final CrmProvider activeProvider;

    public CrmSyncService(java.util.List<CrmAdapter> adapters,
                           CrmSyncLogRepository crmSyncLogRepository,
                           LeadRepository leadRepository,
                           @Value("${lumina.crm.active-provider:HUBSPOT}") CrmProvider activeProvider) {
        this.adaptersByProvider = adapters.stream()
                .collect(Collectors.toMap(CrmAdapter::provider, Function.identity()));
        this.crmSyncLogRepository = crmSyncLogRepository;
        this.leadRepository = leadRepository;
        this.activeProvider = activeProvider;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void syncLead(UUID leadId) {
        Lead lead = leadRepository.findById(leadId).orElseThrow(() -> new LeadNotFoundException(leadId));
        CrmAdapter adapter = adaptersByProvider.get(activeProvider);
        if (adapter == null) {
            log.warn("No CrmAdapter registered for provider {}; lead {} stays PENDING", activeProvider, leadId);
            crmSyncLogRepository.save(CrmSyncLog.builder().lead(lead).crmProvider(activeProvider)
                    .syncStatus(SyncStatus.PENDING).build());
            return;
        }

        CrmSyncLog.CrmSyncLogBuilder logBuilder = CrmSyncLog.builder()
                .lead(lead)
                .crmProvider(activeProvider);

        try {
            String externalId = adapter.sendLead(lead);
            crmSyncLogRepository.save(logBuilder
                    .syncStatus(SyncStatus.SUCCESS)
                    .externalCrmId(externalId)
                    .build());
        } catch (Exception ex) {
            log.warn("CRM sync failed for lead {} on provider {}: {}", leadId, activeProvider, ex.getMessage());
            crmSyncLogRepository.save(logBuilder
                    .syncStatus(SyncStatus.FAILURE)
                    .build());
        }
    }
}
