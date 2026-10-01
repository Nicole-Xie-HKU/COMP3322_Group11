FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/package*.json frontend/
RUN npm --prefix frontend ci
COPY frontend frontend
COPY scheduler scheduler
RUN npm --prefix frontend run build

FROM node:24-alpine AS runtime
WORKDIR /app
COPY backend/package*.json backend/
RUN npm --prefix backend ci --omit=dev
COPY backend backend
COPY Database Database
COPY scheduler scheduler
COPY --from=build /app/frontend/dist frontend/dist
USER node
ENV HOST=0.0.0.0 PORT=3001
EXPOSE 3001
CMD ["node", "backend/server.js"]
