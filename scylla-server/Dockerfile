FROM node:18.18.0 AS Production

ENV NODE_ENV=production

WORKDIR /usr/src/api

COPY package.json . 
COPY package-lock.json .

RUN npm install

COPY . .

# Initialize for git submodules
RUN git init
RUN git submodule add -f https://github.com/Northeastern-Electric-Racing/Odyssey-Base.git ./src/odyssey-base && \
    git submodule update --init --recursive

RUN npm run build
RUN echo "SOURCE_DATABASE_URL=postgresql://postgres:password@docker.for.mac.host.internal:5432/timescaledb" > .env

CMD ["sh", "-c", "npm run prisma:generate && \
    npm run prisma:migrate:prod && \
    npm run start:production"]
