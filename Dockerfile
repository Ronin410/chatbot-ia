# syntax=docker/dockerfile:1

# ---- Etapa de build: compila TypeScript -> JS ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Etapa de producción: solo runtime, sin devDependencies ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# dist/ ya incluye src/config/*.json (ver script "build" en package.json)
COPY --from=build /app/dist ./dist
COPY widget ./widget

EXPOSE 3000

CMD ["node", "dist/server.js"]
