# ---- Builder ----
FROM oven/bun:1.3.3-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun build index.tsx \
    --target bun \
    --outfile dist/server.js \
    --minify

# ---- Runtime ----
FROM oven/bun:1.0.5-alpine

WORKDIR /app

COPY --from=builder /app/dist/server.js ./server.js

ENV PORT=4444
EXPOSE 4444

CMD ["bun", "server.js"]
