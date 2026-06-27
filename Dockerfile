# Single image used for both the Next.js app and the realtime WS server.
# (Dev/devDependencies are kept so the WS server can run via tsx and so
# migrations can run with drizzle-kit.)
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000 1234
# Default command runs the web server; the WS service overrides it in compose.
CMD ["npm", "run", "start"]
