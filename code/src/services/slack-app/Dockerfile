FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY src/packages/shared src/packages/shared
COPY src/services/slack-app src/services/slack-app
RUN npm install --workspace=@kokoro/slack-app
RUN npm run build --workspace=@kokoro/slack-app

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/src/services/slack-app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY src/services/slack-app/package.json ./
CMD ["node", "dist/index.js"]

FROM node:20-alpine AS development
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src/services/slack-app/package.json ./
COPY src/services/slack-app/tsconfig.json ./
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"]
