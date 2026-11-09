#!/bin/sh
set -eu

cd "${APP_BASE_DIR:-/var/www/html}"

if [ -f artisan ]; then
    echo "Running Laravel package discovery..."
    php artisan package:discover --ansi

    # One-time deployment path for the guarded production demo seeder.
    # Keep the Render flag disabled except during the intentional seed deployment.
    if [ "${RESERVEIT_DEMO_SEED_ENABLED:-false}" = "true" ]; then
        echo "Running the explicitly enabled ReserveIT demo seeder..."
        php artisan db:seed --class=DemoScenarioSeeder --force
    fi
fi
