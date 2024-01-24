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

RUN npm run prisma:generate && \
    npm run prisma:migrate:prod

RUN npm run build

CMD ["sh", "-c", "npm run start:production"]