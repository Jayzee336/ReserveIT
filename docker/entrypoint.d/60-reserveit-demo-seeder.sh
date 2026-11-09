#!/bin/sh
set -eu

cd "${APP_BASE_DIR:-/var/www/html}"

# This runs after the image's 50-laravel-automations.sh migration step.
# Enable it only for the intentional demo-data deployment, then remove
# both RESERVEIT_DEMO_SEED_ENABLED and RESERVEIT_DEMO_TEMP_PASSWORD.
if [ -f artisan ] && [ "${RESERVEIT_DEMO_SEED_ENABLED:-false}" = "true" ]; then
    echo "Running the explicitly enabled ReserveIT production demo seeder..."
    php artisan db:seed --class=DemoScenarioSeeder --force
fi
