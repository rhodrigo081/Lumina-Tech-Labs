package lumina.tech.labs.app.dto.admin;

public record AdminDashboardResponse(
        long totalLeads,
        long leadsLast7Days,
        long highPriorityLeads,
        long upcomingMeetings,
        long openSlots,
        long activeTechnicians
) {
}
