package lumina.tech.labs.app.event;

import lumina.tech.labs.app.enums.Priority;

import java.util.UUID;

/**
 * Published by LeadService right after a Lead is persisted (FR03.1-03.3).
 * Consumed by NotificationEventListener and CrmSyncEventListener — this is
 * what keeps the Lead/Diagnostic transaction fast: nothing that talks to
 * an external system (email provider, Slack, CRM) runs inline with it.
 */
public record LeadQualifiedEvent(UUID leadId, Priority priority) {
}
