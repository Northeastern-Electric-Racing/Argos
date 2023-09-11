FROM oven/bun:latest as Production

ENV NODE_ENV=production

COPY package.json . 

RUN bun install

COPY . .

RUN bun run build

CMD ["sh", "-c", "bun start"]