#!/bin/sh
set -eu

cd "${APP_BASE_DIR:-/var/www/html}"

# Run after Laravel's automatic migration step. The seeder uses firstOrCreate,
# so restarts and redeployments do not overwrite administrator-edited details.
if [ -f artisan ]; then
    echo "Ensuring the AVR 2 facility record exists..."
    php artisan db:seed --class=AvrTwoFacilitySeeder --force
fi
