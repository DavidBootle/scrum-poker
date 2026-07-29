# ---------- Build stage ----------
FROM node:lts AS build

WORKDIR /usr/src/app

# Install all dependencies, including TypeScript
COPY package*.json ./
RUN npm ci

# Copy source and configuration
COPY . .

# Compile TypeScript into JavaScript
RUN npm run build


# ---------- Production stage ----------
FROM node:lts-slim AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Install runtime dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from build stage
COPY --from=build --chown=node:node /usr/src/app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/src/server.js"]