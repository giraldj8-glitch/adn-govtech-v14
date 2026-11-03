# ADN GovTech v14 · imagen para Coolify (build pack «Dockerfile»).
# 1) compila la app en un solo HTML; 2) la sirve con server/server.mjs y guarda las respuestas en SQLite (/data).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/xlsx.js ./src/xlsx.js
COPY package.json ./
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/estado || exit 1
CMD ["node", "server/server.mjs"]
