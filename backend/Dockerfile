FROM azul/zulu-openjdk:25 AS builder

RUN apt-get update && apt-get install -y maven

WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM azul/zulu-openjdk:25-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
