package lumina.tech.labs.app.dto.admin;

import java.util.List;

public record AdminSlotBatchResponse(List<AdminSlotResponse> created, int skipped) {
}
