package lumina.tech.labs.app.controller;

import jakarta.validation.Valid;
import lumina.tech.labs.app.dto.request.ContactRequest;
import lumina.tech.labs.app.dto.response.ContactReceiptResponse;
import lumina.tech.labs.app.service.ContactService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contact")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @PostMapping
    public ResponseEntity<ContactReceiptResponse> send(@Valid @RequestBody ContactRequest request,
                                                       @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(contactService.send(request, idempotencyKey));
    }
}
