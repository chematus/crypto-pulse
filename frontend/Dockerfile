FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY ./frontend/package*.json ./

RUN npm ci

COPY ./frontend/ ./

RUN npm run build

FROM nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
