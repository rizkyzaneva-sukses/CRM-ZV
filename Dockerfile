FROM node:20-alpine AS builder

WORKDIR /app

# Install client deps and build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npx vite build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY --from=builder /app/client/dist ./server/public

EXPOSE 3000

CMD ["node", "server/index.js"]
