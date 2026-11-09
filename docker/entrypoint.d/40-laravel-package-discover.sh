#!/bin/sh
set -eu

cd "${APP_BASE_DIR:-/var/www/html}"

if [ -f artisan ]; then
    echo "Running Laravel package discovery..."
    php artisan package:discover --ansi
fi
