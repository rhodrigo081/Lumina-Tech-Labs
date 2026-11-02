# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
ENV NG_CLI_ANALYTICS=false
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/error.html /usr/share/nginx/html/error.html
COPY --from=build /app/dist/lumina-tech-labs/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=5s \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
