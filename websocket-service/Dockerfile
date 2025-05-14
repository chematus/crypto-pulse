FROM node:20-alpine AS builder

WORKDIR /usr/src/app/websocket-service

COPY ./data-fetcher/package*.json ./

RUN npm ci

COPY ./websocket-service/tsconfig.json ./

COPY ./websocket-service/src ./src

COPY ./logger.util.js ./
COPY ./logger.util.d.ts ./

RUN ./node_modules/.bin/tsc --project tsconfig.json || true

RUN ./node_modules/.bin/tsc-alias --project tsconfig.json

FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY ./websocket-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/websocket-service/dist ./dist

COPY --from=builder /usr/src/app/websocket-service/logger.util.js ./logger.util.js

CMD [ "npm", "start" ]
