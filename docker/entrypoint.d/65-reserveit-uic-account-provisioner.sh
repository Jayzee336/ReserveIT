#!/bin/sh
set -eu

cd "${APP_BASE_DIR:-/var/www/html}"

# Explicit opt-in only. Keep disabled for normal deployments.
if [ -f artisan ] && [ "${RESERVEIT_UIC_DEMO_PROVISION_ENABLED:-false}" = "true" ]; then
    if [ "${RESERVEIT_UIC_DEMO_PROVISION_DRY_RUN:-true}" = "true" ]; then
        echo "Running UIC demo account provisioning in DRY-RUN mode..."
        php artisan reserveit:provision-uic-demo-accounts --dry-run
    else
        echo "Running explicitly enabled UIC demo account provisioning..."
        php artisan reserveit:provision-uic-demo-accounts
    fi
fi
