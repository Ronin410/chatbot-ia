# syntax=docker/dockerfile:1

# ---- Etapa de build: instala deps, compila TS y build de módulos nativos ----
# Base Debian (no alpine): better-sqlite3 necesita compilar/descargar un
# binario nativo y alpine (musl) no siempre tiene prebuilds disponibles.
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Toolchain de compilación por si no hay binario prebuilto para better-sqlite3
# en esta plataforma (node-gyp cae a compilar desde código fuente).
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Deja node_modules solo con dependencias de producción (ya compiladas).
RUN npm prune --omit=dev

# ---- Etapa de producción: runtime mínimo, sin toolchain de build ----
FROM node:20-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
# dist/ ya incluye src/config/*.json (ver script "build" en package.json)
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY widget ./widget

EXPOSE 3000

CMD ["node", "dist/server.js"]
