# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

# 依赖层
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# 构建层
FROM base AS builder
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npx tsc

# 运行层
FROM base AS runner
ENV NODE_ENV=production

# better-sqlite3 需要编译工具
RUN apk add --no-cache python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# 数据目录（挂载卷）
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "dist/app.js"]
