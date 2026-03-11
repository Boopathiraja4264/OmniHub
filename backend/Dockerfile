FROM azul/zulu-openjdk:25 AS builder

RUN apt-get update && apt-get install -y maven

# Confirm Java version
RUN java -version && mvn -version

WORKDIR /app
COPY pom.xml .

# Download dependencies first (layer cache)
RUN mvn dependency:go-offline -B 2>/dev/null || true

COPY src ./src

# Build with verbose output to see exactly what ASM version is used
RUN mvn clean package -DskipTests -e 2>&1 | tail -50

FROM azul/zulu-openjdk:25-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
