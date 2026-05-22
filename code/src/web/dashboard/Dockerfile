FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY src/packages/shared src/packages/shared
COPY src/web/dashboard src/web/dashboard
RUN npm install --workspace=@kokoro/dashboard
RUN npm run build --workspace=@kokoro/dashboard

FROM nginx:alpine
COPY --from=builder /app/src/web/dashboard/dist /usr/share/nginx/html
COPY src/web/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
