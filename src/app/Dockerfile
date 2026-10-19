# ==========================================
# Multi-stage Build para o Backend Euditoria
# ==========================================
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Cache de dependências do Maven
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Compilação do código fonte
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==========================================
# Imagem de Execução (Runtime Seguro)
# ==========================================
FROM eclipse-temurin:21-jre-alpine AS runner

WORKDIR /app

# Usuário não-root para segurança corporativa
RUN addgroup -S lumina-tech-labs && adduser -S lumina-tech-labs -G lumina-tech-labs

COPY --from=builder --chown=lumina-tech-labs:lumina-tech-labs /build/target/*.jar app.jar

USER lumina-tech-labs

EXPOSE 8080

# Parâmetros otimizados de JVM para containers
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]