package lumina.tech.labs.app.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Spring Boot only autoconfigures StringRedisTemplate and a raw
 * RedisTemplate<Object, Object> out of the box. ScheduleService depends on
 * RedisTemplate<String, Object> specifically (String keys, arbitrary
 * cached objects — e.g. List<ScheduleSlotResponse> — as values), which is
 * a distinct generic signature and needs its own @Bean.
 *
 * Values are serialized as JSON (GenericJackson2JsonRedisSerializer)
 * rather than Java serialization: smaller payloads, human-readable in
 * redis-cli, and doesn't require every cached DTO to implement
 * Serializable.
 */
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        ObjectMapper objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer(objectMapper));
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer(objectMapper));
        template.afterPropertiesSet();
        return template;
    }
}
