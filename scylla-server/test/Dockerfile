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

RUN docker run -e POSTGRES_HOST_AUTH_METHOD=trust -d -p 5432:5432  --platform=linux/amd64 timescale/timescaledb:2.13.1-pg15

RUN npm run prisma:generate && \
    npm run prisma:migrate:prod

RUN npm run build

CMD ["sh", "-c", "npm run start:production"]