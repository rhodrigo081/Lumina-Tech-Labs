package lumina.tech.labs.app.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex,
                                                              HttpServletRequest request) {
        List<ApiErrorResponse.FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> new ApiErrorResponse.FieldError(fe.getField(), safeMessage(fe)))
                .toList();
        return build(HttpStatus.BAD_REQUEST, "Validation failed", request, fieldErrors);
    }

    @ExceptionHandler(DuplicateLeadException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateLead(DuplicateLeadException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), request, null);
    }

    @ExceptionHandler(IdempotentReplayException.class)
    public ResponseEntity<ApiErrorResponse> handleIdempotentReplay(IdempotentReplayException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), request, null);
    }

    @ExceptionHandler(LeadNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleLeadNotFound(LeadNotFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), request, null);
    }

    @ExceptionHandler(ScheduleConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleScheduleConflict(ScheduleConflictException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), request, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error", request, null);
    }

    private static String safeMessage(FieldError fe) {
        return fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "invalid value";
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String message, HttpServletRequest request,
                                                    List<ApiErrorResponse.FieldError> fieldErrors) {
        ApiErrorResponse body = new ApiErrorResponse(
                LocalDateTime.now(), status.value(), status.getReasonPhrase(), message, request.getRequestURI(), fieldErrors);
        return ResponseEntity.status(status).body(body);
    }
}
