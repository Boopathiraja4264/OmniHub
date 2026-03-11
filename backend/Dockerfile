FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y curl tar ca-certificates wget

# Download Java 25 EA from Oracle (direct stable URL)
RUN mkdir -p /opt/jdk25 && \
    wget -q "https://download.oracle.com/java/25/early_access/jdk/11/GPL/openjdk-25-ea+11_linux-x64_bin.tar.gz" \
    -O /tmp/jdk25.tar.gz && \
    tar -xzf /tmp/jdk25.tar.gz -C /opt/jdk25 --strip-components=1

ENV JAVA_HOME=/opt/jdk25
ENV PATH=$JAVA_HOME/bin:$PATH

# Install Maven
RUN wget -q "https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.tar.gz" \
    -O /tmp/maven.tar.gz && \
    tar -xzf /tmp/maven.tar.gz -C /opt && \
    ln -s /opt/apache-maven-3.9.9/bin/mvn /usr/local/bin/mvn

# Verify
RUN java -version && mvn -version

WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y wget tar ca-certificates && \
    mkdir -p /opt/jdk25 && \
    wget -q "https://download.oracle.com/java/25/early_access/jdk/11/GPL/openjdk-25-ea+11_linux-x64_bin.tar.gz" \
    -O /tmp/jdk25.tar.gz && \
    tar -xzf /tmp/jdk25.tar.gz -C /opt/jdk25 --strip-components=1

ENV JAVA_HOME=/opt/jdk25
ENV PATH=$JAVA_HOME/bin:$PATH
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
