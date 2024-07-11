FROM rust:latest

WORKDIR /usr/src/myapp

COPY . . 
RUN cargo prisma generate
RUN cargo build --release
CMD ["sh", "-c", "cargo prisma migrate deploy && /usr/src/myapp/target/release/scylla-server-rust"]