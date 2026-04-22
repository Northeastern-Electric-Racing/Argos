FROM debian:stable-slim
COPY bin/scylla-server /usr/local/bin/scylla-server
RUN apt-get update && apt-get install -y openssl && apt-get clean && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/local/bin/scylla-server"]
