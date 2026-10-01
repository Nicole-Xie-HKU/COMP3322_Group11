FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY scheduler/ /app/scheduler/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY Database/package*.json ./Database/
RUN npm ci --prefix Database --omit=dev
COPY Database/ ./Database/
COPY scheduler/ ./scheduler/
COPY --from=frontend /app/frontend/dist ./frontend/dist
USER node
EXPOSE 3001
CMD ["sh", "-c", "node Database/setupDatabase.js && node Database/server.js"]
