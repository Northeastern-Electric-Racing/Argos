FROM node:16 AS Production

ENV NODE_ENV=production

WORKDIR /usr/src/api

COPY package.json . 
COPY package-lock.json .

RUN npm install

RUN git submodule update --init --recursive

COPY . .

RUN npx prisma@5.1.1 generate

RUN npx prisma@5.1.1 migrate deploy

RUN npm run build

CMD ["sh", "-c", "npm run start:production"]