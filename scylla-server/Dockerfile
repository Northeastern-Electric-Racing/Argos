FROM node:16 AS Production

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

RUN npx prisma@5.1.1 generate

RUN npx prisma@5.1.1 migrate deploy

RUN npm run build

CMD ["sh", "-c", "npm run start:production"]