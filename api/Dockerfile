# Construir desde la raíz del monorepo:
#   docker build -f api/Dockerfile -t scorecard-api .
#
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY api ./api

RUN npm ci && npm run build -w api

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "api/dist/index.js"]
