# ReserveIT Operations

This document covers local setup, environment configuration, routine maintenance, deployment-oriented checks, troubleshooting, and known implementation risks.

## Prerequisites

- PHP 8.2 or newer
- Composer
- Node.js 18 or newer and npm
- MySQL 8 or the configured Laravel test database
- Laravel Herd on Windows or macOS, or another PHP web server

## Local Setup with Herd

From the project root:

```powershell
composer install
npm install
Copy-Item .env.example .env
php artisan key:generate
php artisan migrate
npm run dev
```

Configure `.env` with environment-specific values. Use placeholders in shared documentation and never commit real credentials:

```dotenv
APP_NAME=ReserveIT
APP_URL=https://<YOUR_HERD_DOMAIN>

DB_CONNECTION=mysql
DB_HOST=<YOUR_DB_HOST>
DB_PORT=3306
DB_DATABASE=<YOUR_DB_NAME>
DB_USERNAME=<YOUR_DB_USERNAME>
DB_PASSWORD=<YOUR_DB_PASSWORD>

QUEUE_CONNECTION=database
MAIL_MAILER=<YOUR_MAIL_DRIVER>
```

The actual Herd domain, database username, password, mail credentials, application key, OAuth secrets, and API keys belong only in the local environment or a secret manager.

On Windows, if Laravel cannot write compiled views or cache files, verify permissions for `storage` and `bootstrap/cache`, then clear cached state:

```powershell
icacls "storage" /grant Everyone:(OI)(CI)F /T
icacls "bootstrap/cache" /grant Everyone:(OI)(CI)F /T
php artisan optimize:clear
```

## Development Processes

For a complete development stack, the Composer `dev` script starts Laravel, the queue listener, log streaming, and Vite concurrently:

```powershell
composer dev
```

For separate processes:

```powershell
php artisan serve
php artisan queue:listen --tries=1 --timeout=0
npm run dev
```

Build production/static assets with:

```powershell
npm run build
```

## Database Operations

Useful commands:

```powershell
php artisan migrate:status
php artisan migrate
php artisan migrate:rollback
php artisan db:seed
```

The defense-feedback upgrade adds a nullable `cancellation_reason` column to bookings. After pulling the branch, back up any database containing data you need, then apply pending migrations with `php artisan migrate` against the intended database.

`migrate:fresh` destroys and recreates all tables and should be limited to disposable local/test databases:

```powershell
php artisan migrate:fresh --seed
```

Before a deployment:

1. Back up the database.
2. Review pending migrations.
3. Confirm environment variables and storage permissions.
4. Run migrations in a maintenance window when necessary.
5. Clear and rebuild application caches.
6. Verify login, booking creation, approval, notifications, and file downloads.

## Account Provisioning

New admin-created accounts receive a generated temporary password and are marked `must_change_password`. Do not place real credentials in documentation, source control, tickets, or chat. Provide a temporary credential through an approved secure channel and require the user to change it at first login.

For local-only Tinker testing, use a locally generated value represented here by a placeholder:

```php
$user = \App\Models\User::create([
    'name' => 'Local Test User',
    'email' => 'local-user@example.test',
    'password' => \Illuminate\Support\Facades\Hash::make('<TEMPORARY_PASSWORD>'),
    'role' => 'user',
    'email_verified_at' => now(),
]);
```

## Routine Maintenance

```powershell
php artisan optimize:clear
php artisan route:list
php artisan config:show app
php artisan test
npm run build
```

Monitor:

- Laravel application logs in `storage/logs`;
- failed queue jobs and the queue worker;
- database growth from notifications, activity logs, and bookings;
- local consent-file storage;
- public facility-image storage;
- scheduled commands, including unapproved-booking purge behavior.

## Queue and Notification Operations

The default queue configuration uses the database driver. If queued work is enabled in the deployed environment:

```powershell
php artisan queue:work --tries=3
php artisan queue:failed
php artisan queue:retry all
```

Notifications displayed by the current UI are database-backed and refreshed through Inertia polling. Broadcasting configuration exists, but the current booking event is not a `ShouldBroadcast` event, so do not assume WebSocket delivery is active.

## Testing

Run the application test suite with:

```powershell
php artisan test
```

Important coverage areas to maintain:

- authentication, verification, password reset, and forced password changes;
- role and facility-assignment authorization;
- booking validation, the 08:00–22:00 booking window, quarter-hour starts, and cleanup-buffer conflict rules;
- approval, decline, cancellation-reason validation, cancellation notifications, and edit state transitions;
- booking-owner check-in/out, assigned Facility Admin/Super Admin access, and rejection of another user's booking;
- check-in/out timestamps, overtime calculation, immutable rate/fee snapshots, and payment-recording authorization;
- facility-scoped client and operations analytics;
- notification sharing and read/clear actions;
- settings persistence;
- consent-file authorization and download behavior.

The feature suite also includes regression coverage for approval conflicts and cleanup buffers, booking-owner check-in/out authorization, owner checkout overtime calculation and payment restrictions, required cancellation reasons and administrator notifications, facility-scoped client/operations analytics, cancellation after check-in, transactional user-management safeguards, and overtime billing snapshots/payment authorization. Run the complete suite locally before release; repository edits alone do not establish that these tests pass.

## Troubleshooting

### Frontend assets do not update

Run `npm install`, confirm Vite is running, check `APP_URL`/TLS detection, and clear Laravel caches with `php artisan optimize:clear`.

### Database tables are missing

Check `.env`, verify the selected connection, run `php artisan migrate:status`, and apply migrations. Do not use `migrate:fresh` against a database containing data you need to preserve.

### Queue work is not processed

Confirm `QUEUE_CONNECTION`, ensure the jobs table exists, and start a worker. Inspect failed jobs and `storage/logs`.

### Consent files cannot be downloaded

Confirm the file exists on the local disk, the booking has consent metadata, the requester is authenticated, and the facility-admin assignment is correct.

### Login redirects unexpectedly

Check email verification, `is_active`, and `must_change_password`. Temporary-password accounts are intentionally redirected to the forced password-change page.

## Verified Operational Notes and Remaining Risks

The following items were checked against the current routes, controllers, models, and migrations in the feature branch:

- **System settings contract:** the model, fillable fields, casts, settings controller validation, and migrations include the current approval scope, overtime rate, cleanup buffer, advance window, maximum duration, consent requirement, and auto-purge retention fields.
- **Auto-purge scheduling:** `bookings:purge-unapproved` is scheduled daily. It is disabled when retention is set to zero and supports `--dry-run`; preview eligible records before enabling it on a production database.
- **Activity-log contract:** the activity log migration and model use `performed_by`; the optional `reason` field is added by a later migration.
- **Approval routes:** admin and facilitator approval/decline routes use the policy-protected facilitator controller. The old direct BookingController approval routes are not registered.
- **Receipt route:** the named `bookings.receipt` route is registered and points to the BookingController receipt action.
- **Middleware bootstrap:** the active application configuration registers the web middleware and role aliases in one reachable application builder chain.

Remaining checks before production:

1. **Booking policy completeness:** verify that every advertised rule—especially capacity, opening hours, blackout dates, manpower, and consent-letter requirements—is enforced server-side, not only in the interface.
2. **Legacy date compatibility:** bookings have both `date` and `booking_date` fields. Continue testing records created before and after the schema change, especially records where one of those fields is null.
3. **Scheduled command operations:** confirm the host actually runs Laravel's scheduler (for example, via the platform's cron/task scheduler). A schedule definition alone does not execute the commands.
4. **External integrations:** verify OAuth credentials, mail delivery, queue workers, and file storage in the target environment; local configuration does not prove those services are operational.
5. **Release verification:** run migrations and the complete PHP test suite, build frontend assets, and complete the manual UAT checklist against a backed-up test database before deployment.

## Extension Checklist

When adding a feature:

1. Add a migration for persistent data.
2. Update model relationships, casts, and mass-assignment definitions.
3. Enforce authorization in middleware/policies, not only in React.
4. Validate on the server even if the form validates in React.
5. Return Inertia props for pages and redirects/flash data for mutations.
6. Use named routes for new frontend requests.
7. Add focused feature tests for permissions and state transitions.
8. Update the relevant document in `docs/` and the README table of contents.
