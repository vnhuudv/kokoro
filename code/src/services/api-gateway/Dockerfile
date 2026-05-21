FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY src/packages/shared src/packages/shared
COPY src/services/api-gateway src/services/api-gateway
RUN npm install --workspace=@kokoro/api-gateway
RUN npm run build --workspace=@kokoro/api-gateway

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/src/services/api-gateway/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY src/services/api-gateway/package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
