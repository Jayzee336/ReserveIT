# ReserveIT — UIC Facility Booking and Management System

ReserveIT is a web-based facility reservation and operations platform designed for the **University of the Immaculate Conception (UIC)**. It centralizes facility discovery, booking requests, approval workflows, attendance monitoring, overtime billing, consent-document handling, and administrative management in one role-based application.

The project is built as a Laravel application with a React interface powered by Inertia.js. It can be run locally for development and is configured for container-based deployment.

> **Live application:** https://reserveit-bpgu.onrender.com  
> **Source code:** https://github.com/Jayzee336/ReserveIT

---

## Table of contents

- [Project overview](#project-overview)
- [Features](#features)
- [User roles](#user-roles)
- [Booking lifecycle](#booking-lifecycle)
- [Overtime calculation](#overtime-calculation)
- [Technology stack](#technology-stack)
- [Production deployment architecture](#production-deployment-architecture)
- [Clone and run locally on Windows](#clone-and-run-locally-on-windows)
- [Environment configuration](#environment-configuration)
- [Database and file storage](#database-and-file-storage)
- [Deploying your own instance](#deploying-your-own-instance)
- [Scheduled tasks and maintenance](#scheduled-tasks-and-maintenance)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Project documentation](#project-documentation)
- [Security and data protection](#security-and-data-protection)

---

## Project overview

ReserveIT helps an institution manage shared facilities and the people who use them. Instead of handling facility requests through disconnected messages or manual schedules, users can submit booking requests through the application and authorized administrators can process them using a consistent workflow.

The system separates ordinary users, facility administrators, and super administrators. Facility administrators are assigned to specific facilities, while super administrators have system-wide administrative access.

The application stores operational records in a relational database. Uploaded consent letters are stored separately in private object storage so that access can be checked before a file is downloaded.

## Features

### User and account management

- Account registration, login, email verification, password reset, and logout.
- Profile management, including name, username, email, and password.
- Role-based access and active/inactive account controls.
- Temporary passwords for administrator-created accounts, with a forced password-change flow.
- Optional Google sign-in when OAuth credentials are configured.

### Facility discovery and scheduling

- Browse facilities and view facility details.
- View facility schedules and existing booking availability.
- Calendar and schedule-grid views.
- Facility information, capacity, location, requirements, and supported manpower options.
- Facility administrators can be assigned to one or more facilities.

### Booking management

- Submit facility booking requests with event details, date, start/end time, attendee count, notes, and optional manpower requirements.
- Validate booking dates, operating hours, duration, capacity, time intervals, and conflicting reservations.
- Pending and approved booking states.
- Edit eligible pending bookings and cancel bookings with a recorded reason.
- Facility-scoped approval and decline workflows.
- Approval attribution and database notifications for booking updates.
- Optional or required consent-letter upload, depending on facility and system rules.

### Check-in, check-out, and operations

- Authorized booking owners and administrators can check in and check out eligible approved bookings.
- Configurable early check-in allowance.
- Active-booking monitoring for administrators.
- Overtime duration and fee calculation at checkout.
- Overtime rate and fee snapshots saved to the booking so later changes to the system rate do not rewrite completed charges.
- Administrator-only recording of manual overtime payment receipt.

### Administration and support

- Super Admin facility management and Facility Admin assignment.
- Booking approval and operational dashboards.
- Configurable booking rules, operating hours, approval scope, cleanup buffer, advance booking window, duration limits, consent requirements, overtime fee, grace period, and unapproved-booking retention.
- User concerns/support tickets submitted by users. Super Admins are responsible for reviewing, replying to, editing replies, and resolving concerns.
- Activity and notification records.

---

## User roles

| Role | Responsibilities |
|---|---|
| **User** (`user`) | Browse facilities and schedules, submit and manage their own eligible bookings, check in/out their own approved bookings, manage their profile, and submit/view concerns. |
| **Facility Admin** (`facility_admin`) | Manage bookings and operations for facilities assigned to them, review requests, approve or decline, check in/out, and monitor active bookings. They cannot access system-wide concern management or reply to/resolve concerns. |
| **Super Admin** (`super_admin`) | System-wide administration, including facilities, users, Facility Admin assignments, booking settings, approvals, concern replies and resolution, and operational monitoring. |

**Important:** A Facility Admin's role does not automatically grant access to every facility. Their permissions are limited by the facility assignments configured by a Super Admin.

---

## Booking lifecycle

A typical booking follows this process:

1. A user selects a facility and submits a booking request.
2. Laravel validates the request and checks the facility's rules and schedule conflicts.
3. Depending on the configured auto-approval policy, the booking becomes **Pending** or **Approved**.
4. An authorized administrator reviews pending requests and approves or declines them when manual review is required.
5. The user checks in for an approved booking within the allowed check-in window.
6. The user or an authorized administrator checks out the booking after use.
7. At checkout, the system records the checkout time and calculates any applicable overtime charge.

### Main booking rules

The server validates the booking rather than relying only on frontend checks. Rules include:

- Facility existence and booking date/time validity.
- Configured maximum booking duration and advance booking window.
- Operating hours and 15-minute time increments.
- Facility capacity and applicable manpower availability.
- Conflicts with pending and approved bookings.
- Configured cleanup buffer between neighboring bookings.
- Consent-document requirements where applicable.
- Consent uploads limited to PDF, DOC, or DOCX files up to 5 MB.

A pending request is not the same as an approved reservation. Pending requests may temporarily hold a time slot while awaiting review.

---

## Overtime calculation

ReserveIT calculates overtime when an eligible booking is checked out.

### Calculation rules

1. The system combines the booking date and scheduled end time to determine when the booking should finish.
2. The configured **overtime grace period** is added to the scheduled end time.
3. Overtime is counted only when the booking was checked in on or before its scheduled end time and checkout occurs after the grace period.
4. The overtime duration is measured in whole minutes after the grace period.
5. The hourly fee is prorated by the number of overtime minutes and rounded to two decimal places.

**Formula:**

```text
Overtime Minutes = Checkout Time - (Scheduled End Time + Grace Period)

Overtime Fee = (Overtime Minutes / 60) × Hourly Overtime Rate
```

The overtime fee is set to zero when the booking is not eligible for overtime or checkout occurs within the grace period.

### Example

Assume the configured hourly rate is **₱150.00** and the grace period is **15 minutes**.

- Scheduled end: 10:00 AM
- Grace period ends: 10:15 AM
- Actual checkout: 10:45 AM
- Chargeable overtime: 30 minutes

```text
(30 / 60) × ₱150.00 = ₱75.00
```

The overtime fee is therefore **₱75.00**.

The rate and final fee are stored as snapshots on the booking at checkout. Changing the system-wide hourly rate later does not alter an already finalized booking fee. A positive fee is marked unpaid until an authorized Facility Admin or Super Admin records receipt of payment; booking owners cannot mark an overtime fee as paid.

---

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | PHP 8.2+ / Laravel 12 | Routing, authentication, validation, authorization, business logic, database access, and file workflows |
| Frontend | React 18 | Interactive user interface |
| Server/client bridge | Inertia.js 2 | Connects Laravel routes and React pages without a separate frontend API for most workflows |
| Styling | Tailwind CSS | Responsive interface and component styling |
| Build tooling | Vite 7 / Node.js | Frontend development server and production asset compilation |
| UI libraries | Lucide React, Framer Motion, Sonner, FullCalendar | Icons, motion, toast notifications, and calendar views |
| Routing helpers | Ziggy | Named Laravel routes in frontend components |
| Authentication integration | Laravel Socialite | Optional Google OAuth sign-in |
| Database access | Laravel Eloquent ORM | Models, relationships, queries, and migrations |
| Automated tests | PHPUnit / Laravel test framework | Feature and application behavior tests |

---

## Production deployment architecture

The current hosted ReserveIT deployment uses the following services:

| Component | Service / technology | What it does |
|---|---|---|
| Web hosting | **Render** (Docker Web Service) | Builds and runs the Laravel application and serves HTTP traffic |
| Container image | **Docker** | Packages the PHP application, Composer dependencies, NGINX/PHP-FPM runtime, and built frontend assets |
| Production database | **Neon PostgreSQL** | Stores users, facilities, bookings, settings, notifications, and other relational application records |
| Private file storage | **Tigris object storage** (S3-compatible) | Stores uploaded booking consent letters privately |
| Frontend build | **Node.js and Vite** during Docker image build | Compiles React/CSS assets into the production build |

### How deployment works

The repository's `Dockerfile` uses a multi-stage build:

1. A Node.js 22 Alpine stage installs frontend dependencies and runs `npm run build`.
2. A PHP Composer stage installs production PHP dependencies.
3. The final image uses the Serversideup PHP 8.3 FPM + NGINX image.
4. The final image includes the Laravel application, Composer dependencies, and compiled frontend assets.
5. Render routes HTTP traffic to the container's configured port (**10000**). The container health-check path is `/up`.

The Docker startup configuration enables safe Laravel startup automation and forward database migrations. Production database migrations should still be reviewed before deployment.

### Important deployment notes

- The current hosted app is separate from a developer's local database and local files.
- Render environment variables contain deployment-specific configuration and secrets; they are not stored in this repository.
- The production database is PostgreSQL on Neon, not the local SQLite database used by the simple Windows setup below.
- Booking consent letters use the private Tigris disk and are served through an authorized application download flow.
- Facility images use Laravel's `public` local filesystem disk (`storage/app/public/facilities`). This is separate from both Neon and Tigris. On Render's default ephemeral filesystem, runtime-uploaded facility images can be lost when the service restarts or redeploys unless persistent storage is configured.
- Laravel scheduler definitions are included in the project. A scheduler process or scheduled job must be configured in the hosting environment for scheduled commands to execute continuously.

---

## Clone and run locally on Windows

The following instructions use **Command Prompt** and a local SQLite database. They are suitable for a fresh development copy.

### Prerequisites

Install:

- Git
- PHP 8.2 or newer, with required Laravel extensions and PDO SQLite enabled
- Composer
- Node.js (22 LTS is recommended for consistency with the Docker frontend build) and npm

XAMPP can provide PHP on Windows. Ensure the PHP executable you intend to use is available in your terminal's PATH.

Check the installed tools:

```bat
git --version
php -v
composer --version
node -v
npm -v
```

### 1. Clone the repository

Open Command Prompt in the folder where you keep your projects:

```bat
git clone https://github.com/Jayzee336/ReserveIT.git
cd ReserveIT
```

To work from the UI/UX engineering branch instead of the repository's default branch:

```bat
git checkout feature/reserveit-uiux-engineering-upgrade
git pull origin feature/reserveit-uiux-engineering-upgrade
```

### 2. Install backend and frontend dependencies

```bat
composer install
npm install
```

### 3. Create your local environment file

The real `.env` file is intentionally excluded from Git:

```bat
copy .env.example .env
```

Open `.env` and confirm the local application and SQLite settings. For a basic local setup, use:

```dotenv
APP_NAME=ReserveIT
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=sqlite
```

Keep the other variables already present in the copied file. Do not replace the whole file with this short snippet.

### 4. Create the SQLite database file

Run this from the project root:

```bat
if not exist database\database.sqlite type nul > database\database.sqlite
```

Make sure the PHP CLI has the PDO SQLite extension enabled. If you prefer MySQL or PostgreSQL for local development, create a database and configure the matching `DB_*` variables instead.

### 5. Generate the application key and run migrations

```bat
php artisan key:generate
php artisan optimize:clear
php artisan migrate
```

Migrations create the schema in your own local database. They do not copy the hosted application's user accounts, facilities, bookings, or other records.

> **Data safety:** Do not run `php artisan migrate:fresh` on a database containing data you want to keep. It drops all tables before rebuilding them.

### 6. Start the application

Open **two Command Prompt windows** in the ReserveIT project directory.

**Window 1 — Laravel backend**

```bat
php artisan serve
```

**Window 2 — Vite frontend**

```bat
npm run dev
```

Open the application at:

http://127.0.0.1:8000

Keep both terminal windows running while developing.

### 7. Build frontend assets for a production-style check

Stop the Vite development server if needed, then run:

```bat
npm run build
```

---

## Environment configuration

The repository includes `.env.example` as a starting point. The values below are examples and placeholders; use your own service credentials.

### Local development

The default example configuration uses SQLite, local filesystem storage, database-backed sessions/queues/cache, and log-based mail. This allows basic development without connecting to the production services.

### Google sign-in (optional)

To enable Google OAuth, configure your own OAuth client and set:

```dotenv
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback
```

The redirect URI must match the callback route and the URI registered in Google Cloud Console. For a deployed site, use the exact HTTPS callback URL for that deployment.

### Production environment variables

Configure production values through Render's Environment settings or your chosen hosting provider's secret manager. Do not commit real values.

| Variable | Purpose |
|---|---|
| `APP_NAME` | Application display name |
| `APP_ENV` | Set to `production` |
| `APP_KEY` | Laravel encryption key generated for the deployment |
| `APP_DEBUG` | Set to `false` in production |
| `APP_URL` | Public HTTPS URL of the deployed application |
| `DB_CONNECTION` | Use `pgsql` for Neon PostgreSQL |
| `DB_HOST`, `DB_PORT` | PostgreSQL host and port supplied by Neon |
| `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | Database name and credentials supplied by Neon |
| `DB_SSLMODE` | Use the SSL mode required by the Neon connection details, commonly `require` |
| `TIGRIS_ACCESS_KEY_ID` | Tigris access key |
| `TIGRIS_SECRET_ACCESS_KEY` | Tigris secret key |
| `TIGRIS_ENDPOINT` | Tigris S3-compatible endpoint |
| `TIGRIS_REGION` | Tigris region; the configuration defaults to `auto` |
| `TIGRIS_BUCKET` | Private bucket name for consent letters |
| `TIGRIS_USE_PATH_STYLE_ENDPOINT` | Tigris endpoint addressing option; match the value provided for your bucket |

Optional integrations such as Google OAuth and mail delivery require their own environment variables and provider configuration. Never copy production secrets into `.env.example`, screenshots, issue reports, or documentation.

---

## Database and file storage

### Neon PostgreSQL — production database

Neon is the hosted application's **relational database**, not a file-storage service and not a seeder service. Laravel migrations create its table structure, and seeders (when intentionally run) insert initial/sample records into whichever database connection is configured. The hosted deployment uses Neon PostgreSQL for persistent relational data, including:

- User accounts, roles, and account status.
- Facilities and Facility Admin assignments.
- Booking requests, approvals, cancellations, check-in/check-out records, and overtime billing snapshots.
- System settings.
- Notifications, concerns, and related application records.

Laravel migrations define the database schema. When deploying your own instance, point the application to your own Neon database (or another supported database) and run migrations against that database.

### SQLite — simple local development database

The Windows quick-start instructions use a local SQLite file at:

```text
database/database.sqlite
```

This database belongs only to that local clone. It is not synchronized with Neon or another developer's database.

### Tigris — private consent-letter storage

Tigris is used for **booking consent letters only** in the current implementation. Booking consent letters are uploaded to the configured **Tigris S3-compatible object-storage disk**, under the `consent-letters/` prefix.

- Files are stored with generated names rather than relying on the original filename as the object key.
- The original filename is retained as booking metadata for display.
- The Tigris disk is configured with **private visibility**.
- Downloads go through an authenticated application endpoint that checks the requester's permissions.
- Super Admins can access consent documents across the system; Facility Admins are limited to their assigned facilities; unauthorized users are denied.
- The application accepts PDF, DOC, and DOCX consent files up to 5 MB.

The bucket credentials must be configured in the hosting environment. Do not make the consent bucket public or expose its secret keys.

### Facility images

Facility images are uploaded to Laravel's `public` filesystem disk, in the `facilities/` directory (physically `storage/app/public/facilities`), and displayed through the application's `/storage/...` public URL. The upload code explicitly uses `Storage`/Laravel's `public` disk; it does **not** send facility images to Neon or Tigris.

- **Local development:** images are stored on the developer's local filesystem.
- **Current Render deployment:** the application container's filesystem is ephemeral by default. Therefore, facility images uploaded at runtime may disappear after a restart or redeploy unless durable storage is configured.
- **Recommended improvement:** move facility images to durable object storage. Tigris could be extended with a separate public-image disk/bucket or a carefully designed public prefix/policy, while keeping consent letters private. Do not make the existing consent-letter objects public.

---

## Deploying your own instance

The current project is configured for Docker-based hosting and can be adapted to another platform that supports the included Dockerfile.

### Render + Neon + Tigris deployment outline

1. Create a PostgreSQL project/database in Neon.
2. Create a private Tigris bucket for consent-letter objects and generate its access credentials.
3. Push the application repository to GitHub.
4. In Render, create a **Docker Web Service** connected to the repository.
5. Set the required production environment variables in Render:
   - Laravel application settings (`APP_KEY`, `APP_ENV`, `APP_DEBUG`, and `APP_URL`);
   - Neon PostgreSQL connection values (`DB_CONNECTION=pgsql`, host, port, database, username, password, and SSL mode);
   - Tigris credentials and bucket settings.
6. Deploy the service and inspect the build/runtime logs.
7. Confirm that database migrations complete successfully.
8. Verify login, booking creation, approval, check-in/check-out, consent upload, and authorized consent download.
9. Configure and verify a scheduler process for Laravel's scheduled commands.

The repository's Dockerfile configures the web container to listen on port 10000 and exposes Laravel's `/up` health-check endpoint. If adapting the Dockerfile to another host, follow that host's port and health-check requirements.

**Do not use a production database for experiments with destructive migration commands or demo seeders.** Back up the database and review migrations before applying changes.

---

## Scheduled tasks and maintenance

The Laravel scheduler defines these recurring commands:

| Command | Schedule | Purpose |
|---|---|---|
| `bookings:check-overtime` | Every 5 minutes | Checks active checked-in bookings that have passed their scheduled end and sends operational notifications. |
| `bookings:purge-unapproved` | Daily | Deletes eligible pending bookings older than the configured retention period when automatic cleanup is enabled. |

### Unapproved-booking cleanup

- A setting of `0` disables automatic cleanup.
- The settings interface offers retention choices of 7 or 14 days.
- Only eligible bookings with `pending` status are targeted by the cleanup command.
- Approved bookings are not targeted.
- This operation permanently deletes matching pending booking records; it is not an archive operation.

Preview the records that would be deleted without deleting them:

```bash
php artisan bookings:purge-unapproved --dry-run
```

Run the actual cleanup only when you intentionally want to delete eligible records:

```bash
php artisan bookings:purge-unapproved
```

### Useful maintenance commands

Run these from the project root:

```bash
php artisan route:list
php artisan migrate:status
php artisan optimize:clear
php artisan test
npm run build
```

For queued work, ensure the configured queue worker is running. The default project configuration uses database-backed queues.

---

## Testing

Run the Laravel test suite:

```bash
php artisan test
```

Some useful focused test commands:

```bash
php artisan test --filter=BookingApprovalWorkflowTest
php artisan test --filter=BookingUpdateTest
php artisan test --filter=BookingCheckInOutTest
php artisan test --filter=BookingSchedulePrivacyTest
php artisan test --filter=ConsentDownloadTest
php artisan test --filter=FacilityAdminAssignmentTest
php artisan test --filter=ProfileTest
```

Build the frontend:

```bash
npm run build
```

Tests cover important application behavior such as authentication, booking validation and approval, facility-scoped authorization, check-in/check-out, overtime billing, consent-file downloads, profile updates, and administrative workflows. Run the tests in your own environment before releasing changes; the existence of tests does not mean they have already passed in every environment.

---

## Troubleshooting

| Problem | What to check |
|---|---|
| `php` is not recognized | Add the intended PHP installation to Windows PATH, reopen the terminal, and run `php -v`. |
| Composer dependency installation fails | Confirm PHP version/extensions and run `composer diagnose`. |
| SQLite driver/database error | Check `DB_CONNECTION=sqlite`, confirm `database/database.sqlite` exists, and enable PDO SQLite for the PHP CLI. |
| Database tables are missing | Check the active `.env` connection, then run `php artisan migrate:status` and apply pending migrations. |
| Frontend changes do not appear | Confirm `npm run dev` is running, or run `npm run build` and refresh the page. |
| Google sign-in fails | Check OAuth credentials, registered callback URL, and `GOOGLE_REDIRECT_URI`; then run `php artisan config:clear`. |
| Consent upload/download fails | Verify Tigris credentials, endpoint, bucket name, private bucket access, and application logs. |
| Laravel cannot write cache or compiled views | Check write permissions for `storage` and `bootstrap/cache`, then run `php artisan optimize:clear`. |
| Facility Admin cannot manage a facility | Confirm the account is active and assigned to that facility. |
| Scheduled commands do not run | Confirm that a scheduler process or scheduled job is configured and running in the hosting environment. |

---

## Project documentation

More detailed technical documentation is available in the `docs/` directory:

- [Architecture](docs/architecture.md) — application structure, request lifecycle, authorization, and frontend/backend communication.
- [Database](docs/database.md) — database tables, relationships, migrations, and storage behavior.
- [Workflows](docs/workflows.md) — booking lifecycle, validation rules, approvals, check-in/check-out, and overtime behavior.
- [Operations](docs/operations.md) — local operations, environment configuration, deployment checks, maintenance, and troubleshooting.

---

## Security and data protection

- Never commit `.env`, database files containing personal information, passwords, API keys, OAuth secrets, or storage credentials.
- Use separate credentials and databases for local development, testing, and production.
- Keep consent-letter storage private. Serve documents through the application's authorized download flow.
- Set `APP_DEBUG=false` in production.
- Use HTTPS for deployed environments and configure OAuth callback URLs accordingly.
- Back up important databases before applying migrations.
- Review migration and cleanup behavior before running commands against production data.
- Use synthetic test data for development and demonstrations.
- Do not publish real user credentials or temporary passwords in this repository.

---

## License

No separate project license is currently declared in the repository. Contact the project maintainers before redistributing or reusing the application outside its intended context.
