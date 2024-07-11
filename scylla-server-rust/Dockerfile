FROM rust:latest

WORKDIR /usr/src/myapp

COPY . . 
RUN cargo prisma generate
RUN cargo build --release --locked
ENTRYPOINT ["./docker_run.sh"]