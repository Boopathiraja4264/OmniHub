FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y curl tar ca-certificates

# Install Java 25 (GA) via Microsoft build
RUN mkdir -p /opt/jdk25 && \
    curl -L "https://aka.ms/download-jdk/microsoft-jdk-25-linux-x64.tar.gz" -o /tmp/jdk25.tar.gz && \
    tar -xzf /tmp/jdk25.tar.gz -C /opt/jdk25 --strip-components=1

ENV JAVA_HOME=/opt/jdk25
ENV PATH=$JAVA_HOME/bin:$PATH

# Install Maven
RUN curl -L "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz" -o /tmp/maven.tar.gz && \
    tar -xzf /tmp/maven.tar.gz -C /opt && \
    ln -s /opt/apache-maven-3.9.6/bin/mvn /usr/local/bin/mvn

WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y curl tar ca-certificates && \
    mkdir -p /opt/jdk25 && \
    curl -L "https://aka.ms/download-jdk/microsoft-jdk-25-linux-x64.tar.gz" -o /tmp/jdk25.tar.gz && \
    tar -xzf /tmp/jdk25.tar.gz -C /opt/jdk25 --strip-components=1

ENV JAVA_HOME=/opt/jdk25
ENV PATH=$JAVA_HOME/bin:$PATH
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
