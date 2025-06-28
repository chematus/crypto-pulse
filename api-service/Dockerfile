FROM node:20-alpine AS builder

WORKDIR /usr/src/app/api-service

COPY ./api-service/package*.json ./

RUN npm ci

COPY ./api-service/tsconfig.json ./

COPY ./api-service/src ./src

COPY ./logger.util.js ./
COPY ./logger.util.d.ts ./

RUN ./node_modules/.bin/tsc --project tsconfig.json  || true

RUN ./node_modules/.bin/tsc-alias --project tsconfig.json 

FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY ./api-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/api-service/dist ./dist

COPY --from=builder /usr/src/app/api-service/logger.util.js ./logger.util.js

EXPOSE ${API_PORT:-5001}

CMD [ "npm", "start" ]
