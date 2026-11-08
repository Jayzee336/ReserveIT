# Build the Vite frontend assets.
FROM node:22-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# Install production PHP dependencies with the PostgreSQL extensions available.
FROM serversideup/php:8.3-cli AS vendor

WORKDIR /var/www/html

COPY --chown=www-data:www-data . .
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts


# Production web image: NGINX + PHP-FPM.
FROM serversideup/php:8.3-fpm-nginx

# NGINX must serve PDF.js ES-module workers with a JavaScript MIME type.
USER root
RUN grep -q 'application/javascript js;' /etc/nginx/mime.types \
    && sed -i '/application\\/javascript/s/ js;/ js mjs;/' /etc/nginx/mime.types
USER www-data

WORKDIR /var/www/html

COPY --chown=www-data:www-data . .
COPY --from=vendor --chown=www-data:www-data /var/www/html/vendor ./vendor
COPY --from=frontend --chown=www-data:www-data /app/public/build ./public/build
COPY --chown=root:root docker/entrypoint.d/ /etc/entrypoint.d/

# Render routes HTTP traffic to the port configured here.
ENV NGINX_HTTP_PORT=10000
ENV NGINX_WEBROOT=/var/www/html/public
ENV HEALTHCHECK_PATH=/up

# Laravel startup tasks: run safe forward migrations and cache config/views/events.
# Route caching is disabled because this application defines closure-based routes.
ENV AUTORUN_ENABLED=true
ENV AUTORUN_LARAVEL_OPTIMIZE=false
ENV AUTORUN_LARAVEL_ROUTE_CACHE=false
ENV AUTORUN_LARAVEL_EVENT_CACHE=true
ENV AUTORUN_LARAVEL_CONFIG_CACHE=true
ENV AUTORUN_LARAVEL_VIEW_CACHE=true
ENV AUTORUN_LARAVEL_MIGRATION=true
ENV AUTORUN_LARAVEL_MIGRATION_FORCE=true
ENV AUTORUN_LARAVEL_MIGRATION_MODE=default
ENV AUTORUN_LARAVEL_MIGRATION_SEED=false
ENV AUTORUN_LARAVEL_STORAGE_LINK=false

ENV PHP_OPCACHE_ENABLE=1
