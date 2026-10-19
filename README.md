# ReserveIT — UIC Facility Booking System

ReserveIT is a web-based facility reservation and scheduling management system designed for the University of the Immaculate Conception (UIC). It allows users to request facilities, supports role-based booking decisions, and gives authorized administrators tools to manage facilities, bookings, and related workflows.

> **Project status:** This repository contains application source code. Each installation needs its own environment configuration and database. The repository does not include your local `.env`, database records, or user accounts.

## Contents

- [Features](#features)
- [Roles and permissions](#roles-and-permissions)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Run locally on Windows](#run-locally-on-windows)
- [Environment variables and Google sign-in](#environment-variables-and-google-sign-in)
- [Create local test accounts](#create-local-test-accounts)
- [Booking workflow notes](#booking-workflow-notes)
- [Useful commands](#useful-commands)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Additional documentation](#additional-documentation)
- [Security notes](#security-notes)

## Features

- **Facility reservations:** Browse available facilities and submit booking requests.
- **Booking approval workflow:** Authorized facility administrators can review and approve or decline requests for facilities assigned to them.
- **Role-based access control:** Separates regular users, facility administrators, and super administrators.
- **Facility management:** Authorized super administrators can create and update facility records.
- **Facility-admin assignments:** Super administrators can assign eligible facility administrators to facilities. Facility administrators' access is scoped to their assignments.
- **Booking updates and cancellation:** Users can update pending booking details and cancel bookings according to the application's booking rules.
- **Check-in and check-out:** Authorized facility administrators can check in and check out bookings for facilities they manage.
- **Active-booking monitoring:** Administrator views can display active bookings and calculate overtime information.
- **Overtime billing:** Booking records support overtime tracking and fee calculation based on the configured rate and booking duration.
- **Unapproved-booking cleanup:** Includes a command and system settings for managing the cleanup of eligible unapproved bookings. Review the current settings and operations documentation before enabling automatic cleanup.
- **Activity logging:** Records selected system activities for administrative review.
- **Consent and document workflows:** Supports consent-related document handling and authorized downloads.
- **User concerns:** Users can submit concerns and view replies through the support workflow.
- **Google sign-in:** Optional Google OAuth sign-in when valid credentials and callback settings are configured.

The exact actions available to an account depend on its role, facility assignments, application settings, and the current implementation.

## Roles and permissions

| Role | Purpose |
|---|---|
| `user` | Regular account that can use booking and supported user-facing workflows. |
| `facility_admin` | Manages bookings and check-in/check-out for facilities assigned to that administrator. |
| `super_admin` | Performs higher-level facility and administrator management and has broader administrative access. |

A facility administrator's role alone does not necessarily grant access to every facility. The administrator must be assigned to the relevant facility. Create administrator accounts only when you are authorized to do so.

## Technology stack

- **Backend:** PHP 8.2+, Laravel 12
- **Frontend:** React 18, Inertia.js, Vite, Tailwind CSS
- **Routing helpers:** Ziggy
- **Database:** SQLite for a simple local setup; MySQL is also documented in the operations guide
- **Authentication integration:** Laravel Socialite for Google OAuth
- **Testing:** PHPUnit / Laravel feature tests

## Requirements

Install the following before starting:

- PHP 8.2 or newer, with the Laravel-required extensions, including PDO SQLite when using SQLite
- Composer
- Node.js 18 or newer and npm
- Git

On Windows, you can use XAMPP for PHP or another PHP environment. Make sure Command Prompt uses the intended PHP installation. Check the installed tools:

```bat
php -v
composer --version
node -v
npm -v
```

## Run locally on Windows

Open Command Prompt in the folder where you want to store the project.

### 1. Clone the repository

```bat
git clone https://github.com/Jayzee336/ReserveIT.git
cd ReserveIT
```

If you already have the repository cloned, open Command Prompt in your existing project directory instead of cloning it again.

### 2. Install dependencies

```bat
composer install
npm install
```

### 3. Create the local environment file

The real `.env` file is intentionally not committed to GitHub.

```bat
copy .env.example .env
```

Open `.env` in your editor and set the appropriate application URL and database settings. For a basic local SQLite setup, use these values as a guide:

```dotenv
APP_NAME=ReserveIT
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=sqlite
```

Keep the other required variables in the copied `.env` file. Do not replace the entire file with only this snippet.

### 4. Create the SQLite database file

If `database\database.sqlite` does not exist, create an empty file from Command Prompt:

```bat
if not exist database\database.sqlite type nul > database\database.sqlite
```

Make sure PDO SQLite is enabled for the PHP CLI. If you use MySQL instead, create a local database and update the appropriate `DB_*` variables in `.env`.

### 5. Generate the application key and run migrations

```bat
php artisan key:generate
php artisan optimize:clear
php artisan migrate
```

Migrations create the database tables; they **do not** copy user accounts, facilities, bookings, or other records from another developer's computer.

> **Warning:** Avoid `php artisan migrate:fresh` unless you intentionally want to delete all tables and data in the selected database. Never run it against a database containing information you need to keep.

### 6. Start the application

Open two Command Prompt windows in the project folder.

**Window 1 — Laravel server**

```bat
php artisan serve
```

**Window 2 — Vite development server**

```bat
npm run dev
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser. Keep both terminal windows running during development.

To create a production-style frontend build, run:

```bat
npm run build
```

## Environment variables and Google sign-in

- Keep `.env` local. It may contain the application key, database credentials, and OAuth secrets.
- Use `.env.example` as a template only; do not put real secrets in it.
- Google sign-in is optional for local testing. To enable it, create your own OAuth client and configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in your local `.env`.
- For the local URL above, the callback is typically `http://127.0.0.1:8000/auth/google/callback`, provided that this matches the callback route and the URI registered in Google Cloud Console.
- Never reuse someone else's OAuth secret. A deployed site needs its own correct HTTPS callback URL configured both in the hosting environment and in Google Cloud Console.

After changing environment values, clear the cached configuration:

```bat
php artisan config:clear
```

## Create local test accounts

A new local database starts without the accounts from another developer's computer. Register a regular user through the application if registration is enabled.

The role names used by the application are `user`, `facility_admin`, and `super_admin`. For local testing, you can create accounts with Laravel Tinker.

Start Tinker:

```bat
php artisan tinker
```

Run **one snippet at a time**. Replace the sample names, email addresses, and passwords for your local test database.

### 1. Regular user

```php
$user = \App\Models\User::create([
    'name' => 'Local Test User',
    'email' => 'local-user@example.test',
    'password' => \Illuminate\Support\Facades\Hash::make('CHANGE-THIS-LOCAL-TEST-PASSWORD'),
    'role' => 'user',
    'is_active' => true,
    'must_change_password' => false,
]);

$user->forceFill(['email_verified_at' => now()])->save();
```

### 2. Facility administrator

```php
$admin = \App\Models\User::create([
    'name' => 'Local Facility Admin',
    'email' => 'local-facility-admin@example.test',
    'password' => \Illuminate\Support\Facades\Hash::make('CHANGE-THIS-LOCAL-TEST-PASSWORD'),
    'role' => 'facility_admin',
    'is_active' => true,
    'must_change_password' => false,
]);

$admin->forceFill(['email_verified_at' => now()])->save();
```

A facility administrator may also need to be assigned to one or more facilities through the application's facility-admin assignment interface before they can manage those facilities.

### 3. Super administrator

```php
$admin = \App\Models\User::create([
    'name' => 'Local Super Admin',
    'email' => 'local-super-admin@example.test',
    'password' => \Illuminate\Support\Facades\Hash::make('CHANGE-THIS-LOCAL-TEST-PASSWORD'),
    'role' => 'super_admin',
    'is_active' => true,
    'must_change_password' => false,
]);

$admin->forceFill(['email_verified_at' => now()])->save();
```

Type `exit` to leave Tinker. Use unique email addresses. The sample password is a placeholder: replace it with a strong local testing password and never use it on a public deployment.

These snippets create accounts in **your local database only**. They do not create accounts for other people who clone the repository. If a snippet fails because a field is not fillable or does not exist in your current schema, check the `User` model and migrations before proceeding.

## Booking workflow notes

- Users submit booking requests through the booking interface.
- Booking decisions are restricted by role and facility assignment.
- Facility administrators should only manage bookings for facilities assigned to them.
- Check-in/check-out actions are restricted to authorized accounts and eligible booking states.
- Overtime fees depend on the booking's timing and configured billing settings.
- Automatic cleanup behavior depends on the current command and system settings. Review the operations guide and settings in your installation before enabling or relying on scheduled cleanup.

For the exact lifecycle rules and configuration details, see the [workflow documentation](docs/workflows.md) and the [operations guide](docs/operations.md).

## Useful commands

Run these from the project directory:

```bat
php artisan route:list
php artisan migrate:status
php artisan test
php artisan optimize:clear
npm run build
```

## Testing

Run the Laravel test suite with:

```bat
php artisan test
```

Tests exercise application behavior such as booking approval, role and facility authorization, check-in/check-out, facility management, consent downloads, booking updates, authentication, and profile workflows.

A passing test suite is useful verification, but it does not replace manual testing of the user interface and deployment configuration.

## Troubleshooting

- **`php` is not recognized or the version is too old:** Add the correct PHP installation to Windows `PATH`, reopen Command Prompt, and run `php -v`.
- **SQLite database or driver errors:** Verify `DB_CONNECTION=sqlite`, confirm `database\database.sqlite` exists, and ensure PDO SQLite is enabled for the PHP CLI.
- **Missing tables:** Check `.env` and run `php artisan migrate`.
- **Frontend changes are not visible:** Ensure `npm run dev` is running, or run `npm run build` and refresh the page.
- **Google sign-in fails:** Check the OAuth client credentials, authorized redirect URI, and `GOOGLE_REDIRECT_URI`; then run `php artisan config:clear`.
- **Laravel cannot write cache or compiled views:** Check write access to `storage` and `bootstrap/cache`, then run `php artisan optimize:clear`.
- **A facility administrator cannot manage a facility:** Verify that the account is active and assigned to that facility.

## Additional documentation

- [Architecture](docs/architecture.md) — system design, technology stack, data flow, authorization, and frontend/backend communication
- [Database](docs/database.md) — schemas, relationships, migrations, and file storage
- [Workflows](docs/workflows.md) — booking lifecycle, business rules, roles, approvals, support, and operations
- [Operations](docs/operations.md) — environment configuration, maintenance, deployment checks, testing, and troubleshooting

## Security notes

- Never commit `.env`, database files containing personal data, OAuth secrets, API keys, or passwords.
- Use synthetic data for demonstrations and development.
- Set `APP_DEBUG=false` in production and configure secrets through the hosting provider's environment settings.
- Back up important databases before applying migrations.
- Review and test authorization, validation, storage, scheduled tasks, and deployment settings before using the application with real users or sensitive information.