FROM rust:latest AS builder

WORKDIR /usr/src/myapp

COPY . .
ARG TARGETPLATFORM
RUN --mount=type=cache,target=/usr/local/cargo/registry,id=cargo-registry \
    --mount=type=cache,target=/usr/src/myapp/target,id=cargo-target-${TARGETPLATFORM} \
    cargo install --path . --locked --profile release

FROM debian:stable-slim
COPY --from=builder /usr/local/cargo/bin/scylla-server /usr/local/bin/scylla-server
RUN apt-get update && apt install -y openssl && apt clean && rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["/usr/local/bin/scylla-server"]
