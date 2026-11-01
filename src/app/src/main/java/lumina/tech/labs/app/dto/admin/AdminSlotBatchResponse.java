package lumina.tech.labs.app.dto.admin;

import java.util.List;

/** `skipped` counts generated times that were in the past or overlapped an existing slot. */
public record AdminSlotBatchResponse(List<AdminSlotResponse> created, int skipped) {
}
