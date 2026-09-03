# Bot runtime service.
# Build from the repo root:  docker build -f runtime/Dockerfile -t bottly-runtime runtime
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS release
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist

# Long-lived gateway connections: never run as root, and let the platform
# restart the container on failure rather than swallowing crashes.
USER node
EXPOSE 8787
CMD ["node", "dist/index.js"]