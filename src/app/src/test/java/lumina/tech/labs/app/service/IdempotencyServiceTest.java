package lumina.tech.labs.app.service;

import lumina.tech.labs.app.exception.ApiException;
import lumina.tech.labs.app.exception.IdempotentReplayException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class IdempotencyServiceTest {

    private static final String REDIS_KEY = "idempotency:lead:key-1";

    @SuppressWarnings("unchecked")
    private final ValueOperations<String, String> ops = mock(ValueOperations.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final IdempotencyService service = new IdempotencyService(redis, 15);

    @BeforeEach
    void setUp() {
        given(redis.opsForValue()).willReturn(ops);
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    @Test
    void firstRequestStoresTheCreatedIdOnCommit() {
        given(ops.setIfAbsent(eq(REDIS_KEY), eq("PENDING"), eq(Duration.ofMinutes(15)))).willReturn(true);

        IdempotencyService.Result result = service.begin("lead", "key-1");
        assertThat(result.completedResourceId()).isEmpty();

        UUID created = UUID.randomUUID();
        result.reservation().complete(created);
        complete(TransactionSynchronization.STATUS_COMMITTED);

        verify(ops).set(REDIS_KEY, created.toString(), Duration.ofMinutes(15));
        verify(redis, never()).delete(anyString());
    }

    @Test
    void rollbackReleasesTheKeySoTheRetryIsProcessed() {
        given(ops.setIfAbsent(eq(REDIS_KEY), eq("PENDING"), eq(Duration.ofMinutes(15)))).willReturn(true);

        service.begin("lead", "key-1");
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);

        verify(redis).delete(REDIS_KEY);
    }

    @Test
    void completedKeyReplaysTheOriginalResource() {
        UUID created = UUID.randomUUID();
        given(ops.setIfAbsent(eq(REDIS_KEY), eq("PENDING"), eq(Duration.ofMinutes(15)))).willReturn(false);
        given(ops.get(REDIS_KEY)).willReturn(created.toString());

        assertThat(service.begin("lead", "key-1").completedResourceId()).contains(created);
        assertThat(TransactionSynchronizationManager.getSynchronizations()).isEmpty();
    }

    @Test
    void keyStillInProgressIsAConflict() {
        given(ops.setIfAbsent(eq(REDIS_KEY), eq("PENDING"), eq(Duration.ofMinutes(15)))).willReturn(false);
        given(ops.get(REDIS_KEY)).willReturn("PENDING");

        assertThatThrownBy(() -> service.begin("lead", "key-1")).isInstanceOf(IdempotentReplayException.class);
    }

    @Test
    void oversizedKeyIsRejected() {
        assertThatThrownBy(() -> service.begin("lead", "x".repeat(101)))
                .isInstanceOf(ApiException.class).extracting("code").isEqualTo("INVALID_IDEMPOTENCY_KEY");
    }

    private static void complete(int status) {
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(status));
    }
}
