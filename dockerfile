# Use the official Bun image
FROM oven/bun:1-slim AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Final image
FROM base AS release
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Run the bot
USER bun
EXPOSE 21000/tcp
ENTRYPOINT [ "bun", "run", "server.ts" ]
