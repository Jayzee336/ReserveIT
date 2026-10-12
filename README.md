# ReserveIT — UIC Facility Booking System

ReserveIT is a web-based facility reservation and scheduling management system designed for the University of the Immaculate Conception (UIC). It helps users request facilities, supports role-based approval workflows, and provides tools for facility administrators to manage bookings.

> **Project status:** This repository contains the application source code. A local installation needs its own environment configuration and database. It does not include your local `.env`, database records, or user accounts.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Run locally on Windows](#run-locally-on-windows)
- [Environment variables and Google sign-in](#environment-variables-and-google-sign-in)
- [Accounts and roles](#accounts-and-roles)
- [Useful commands](#useful-commands)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Security notes](#security-notes)

## Features

- **Role-based access control:** separate capabilities for `super_admin`, `facility_admin`, and regular `user` roles.
- **Facility booking:** browse facilities and submit booking requests.
- **Booking management:** review booking status and support approval workflows.
- **Scheduling rules:** supports booking conflict checks and cleanup-buffer logic.
- **Facility administration:** tools for managing assigned facilities and bookings.
- **Consent and document workflows:** supports consent-letter submission and related document handling.
- **Support tickets:** users can submit concerns and view replies.
- **Google sign-in:** optional OAuth sign-in when credentials are configured.

The exact capabilities available to an account depend on its assigned role and the application's current configuration.

## Technology stack

- **Backend:** PHP 8.2+, Laravel 12
- **Frontend:** React 18, Inertia.js, Vite, Tailwind CSS
- **Routing helpers:** Ziggy
- **Database:** SQLite for a simple local setup; MySQL is also documented in the project's operations guide
- **Authentication integration:** Laravel Socialite for Google OAuth

## Requirements

Install the following before starting:

- PHP 8.2 or newer, with the required Laravel extensions (including PDO SQLite if using SQLite)
- Composer
- Node.js 18 or newer and npm
- Git

On Windows, you can use XAMPP for PHP, or another PHP environment. Make sure the PHP version used by Command Prompt is 8.2 or newer. Check with:

```bat
php -v
composer --version
node -v
npm -v
```

## Run locally on Windows

Open Command Prompt in the folder where you want to store the project.

### 1. Clone this repository

```bat
git clone https://github.com/Jayzee336/ReserveIT.git
cd ReserveIT
```

### 2. Install dependencies

```bat
composer install
npm install
```

### 3. Create your local environment file

Copy the example configuration. The real `.env` file is intentionally not committed to GitHub.

```bat
copy .env.example .env
```

Open `.env` in your editor and set at least the appropriate application URL and database settings. For a basic local SQLite setup, use:

```dotenv
APP_NAME=ReserveIT
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=sqlite
```

Keep any existing required variables in your copied `.env` file. Do not replace the whole file with only this snippet.

### 4. Create the SQLite database file

If `database\database.sqlite` does not exist, create an empty file from Command Prompt:

```bat
if not exist database\database.sqlite type nul > database\database.sqlite
```

Make sure PHP has the PDO SQLite extension enabled. If your local installation is configured to use MySQL instead, create a local database and update the `DB_*` variables accordingly.

### 5. Generate the application key and run migrations

```bat
php artisan key:generate
php artisan optimize:clear
php artisan migrate
```

Migrations create the database tables; they do **not** copy your existing local user accounts or booking data into the new installation. If Laravel reports a missing driver or database error, check the selected connection and PHP database extensions.

> **Warning:** Avoid `php artisan migrate:fresh` unless you intentionally want to delete all tables and data in the selected database. Never run it against a database containing information you need to keep.

### 6. Start the application

Open two Command Prompt windows in the project folder.

**Window 1 — Laravel server:**

```bat
php artisan serve
```

**Window 2 — Vite frontend:**

```bat
npm run dev
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser. Keep both terminal windows open while developing.

To create a production-style frontend build instead, run:

```bat
npm run build
```

## Environment variables and Google sign-in

- Keep `.env` local. It may contain your application key, database credentials, and OAuth secrets.
- Use `.env.example` as a template only; do not put real secrets in it.
- Google sign-in is optional for local testing. To enable it, create your own OAuth client and configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in your local `.env`.
- For the local URL above, the callback is typically `http://127.0.0.1:8000/auth/google/callback`, provided that this matches the callback route and the URI registered in Google Cloud Console.
- Never reuse someone else's OAuth secret. A deployed site must have its own correct HTTPS callback URL configured in both the hosting environment and Google Cloud Console.

After changing environment values, run:

```bat
php artisan config:clear
```

## Accounts and roles

A new local database starts without the accounts from another developer's computer. Register a regular user through the application if registration is enabled.

The supported role names used by the application include:

- `user` — regular user
- `facility_admin` — facility administrator
- `super_admin` — super administrator

Admin accounts may require authorized provisioning by an existing administrator or a trusted developer using Laravel Tinker. Do not assume that cloning the repository creates admin accounts automatically.

For local-only testing, you can create a user through Tinker after migrations have completed:

```bat
php artisan tinker
```

Then enter the following PHP, changing the name, email, and password to values intended only for your local test database:

```php
\App\Models\User::create([
    'name' => 'Local Test User',
    'email' => 'local-user@example.test',
    'password' => \Illuminate\Support\Facades\Hash::make('CHANGE-THIS-LOCAL-TEST-PASSWORD'),
    'role' => 'user',
    'email_verified_at' => now(),
]);
```

Type `exit` to leave Tinker. Do not use this example password on a public deployment, and do not commit real credentials or real user data. For admin-role testing, use an authorized local development process and follow the application's required account status and password-change fields.

## Useful commands

```bat
php artisan route:list
php artisan migrate:status
php artisan test
php artisan optimize:clear
npm run build
```

## Troubleshooting

- **`php` is not recognized or the version is too old:** add the correct PHP installation to your Windows PATH, reopen Command Prompt, and run `php -v`.
- **SQLite database/driver errors:** verify that `DB_CONNECTION=sqlite`, the `database\database.sqlite` file exists, and PDO SQLite is enabled for the PHP CLI.
- **Missing tables:** check `.env` and run `php artisan migrate`.
- **Frontend changes are not visible:** ensure `npm run dev` is running, or run `npm run build` and refresh the page.
- **Google sign-in fails:** check the OAuth client credentials, authorized redirect URI, and `GOOGLE_REDIRECT_URI`; then run `php artisan config:clear`.
- **Laravel cannot write cache or compiled views:** check write access to `storage` and `bootstrap/cache`, then run `php artisan optimize:clear`.

## Documentation

- [Architecture](docs/architecture.md) — system design, technology stack, data flow, authorization, and frontend/backend communication
- [Database](docs/database.md) — schemas, relationships, migrations, and file storage
- [Workflows](docs/workflows.md) — booking lifecycle, business rules, roles, approvals, support, and operations
- [Operations](docs/operations.md) — environment configuration, maintenance, deployment checks, testing, and troubleshooting

## Security notes

- Never commit `.env`, database files containing personal data, OAuth secrets, API keys, or passwords.
- Use synthetic data for demos and development.
- Set `APP_DEBUG=false` in production and configure secrets through the hosting provider's environment settings.
- Back up important databases before applying migrations.
- This repository is a development project; review and test authorization, validation, storage, and deployment settings before using it with real users or sensitive information.
