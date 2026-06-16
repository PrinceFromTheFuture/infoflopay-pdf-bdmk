FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

ENV PORT=4444
EXPOSE 4444

CMD ["bun", "index.tsx"]
