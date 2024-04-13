FROM node:18.18.0 AS Production

ENV NODE_ENV=production

WORKDIR /usr/src/api

COPY package.json . 
COPY package-lock.json .

RUN npm ci --only=production

COPY . .

# Initialize for git submodules
RUN git init
RUN git submodule add -f https://github.com/Northeastern-Electric-Racing/Odyssey-Base.git ./src/odyssey-base && \
    git submodule update --init --recursive

RUN npm run prisma:generate
RUN npm run build
# RUN echo "SOURCE_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/timescaledb" >> .env

EXPOSE 8000

CMD ["sh", "-c", "npm run prisma:migrate:prod && \
    npm run start:production"]
