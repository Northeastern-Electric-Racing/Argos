FROM oven/bun:1.0.0 as Production

RUN apt-get update && apt-get install -y curl

ARG NODE_VERSION=18
RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n \
    && bash n $NODE_VERSION \
    && rm n \
    && npm install -g n

ENV NODE_ENV=production

WORKDIR /usr/src/api

COPY package.json . 

RUN bun install

COPY . .

RUN bun run build

RUN bunx prisma generate

RUN bunx prisma migrate deploy

CMD ["sh", "-c", "bun start"]