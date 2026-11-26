# Architecture

## Overview

```
Browser (Angular SPA, PWA)
        │  JSON over HTTPS, session cookie + CSRF token
        ▼
Django + Django REST Framework  ──  PostgreSQL
        ▲
        │  hourly
Cleanup job (management command) deletes expired guests
```

Frontend and API run on the same subdomain, so the session cookie works without any cross-site setup.

## Repository layout

```
backend/    Django project
frontend/   Angular app
docs/       documentation
```

## Backend

| App | Responsibility |
|---|---|
| `accounts` | login, logout, current user, password change, guest accounts and their cleanup |
| `tracker` | applications, notes, watchlist |

Every model that belongs to a user has a foreign key to that user, and every queryset is filtered by the logged-in user. That way nobody ever sees someone else's data.

## Data model

### Application

| Field | Type | Notes |
|---|---|---|
| `user` | FK → User | owner |
| `company` | text | required |
| `website` | URL | required |
| `role` | text | default "Fullstack Developer" |
| `location` | text | optional |
| `work_mode` | choice | `remote` (default), `hybrid`, `on_site` |
| `status` | choice | see below, default `not_applied` |
| `applied_on` | date | set to today when the status first leaves `not_applied`, never overwritten, read-only in the API |
| `responded_on` | date | set to today on the first status after `awaiting_response` (calls, interviews, offer, both rejections), never overwritten, read-only in the API |
| `next_step` | text | optional |
| `next_step_on` | date | optional appointment |
| `job_ad_url` | URL | optional |
| `contact` | text | optional |
| `salary_expectation` | text | optional |
| `created_at`, `updated_at` | datetime | |

Text fields hold at most 120 characters (next step 200, salary expectation 60), URLs 500, note texts 5000. Lists come newest first, notes by last update.

Statuses: `not_applied`, `awaiting_response`, `intro_call_scheduled`, `further_interview`, `offer`, `rejected_after_application`, `rejected_after_interview`.

### Note

| Field | Type | Notes |
|---|---|---|
| `application` | FK → Application | deleted with the application |
| `title` | text | title or text is required (database constraint) |
| `text` | text | |
| `created_at`, `updated_at` | datetime | |

### WatchItem

| Field | Type | Notes |
|---|---|---|
| `user` | FK → User | owner |
| `company` | text | required |
| `website` | URL | required |
| `careers_url` | URL | optional |
| `location` | text | optional |
| `plan` | choice | `apply` (default), `watch` |
| `note` | text | optional |
| `created_at`, `updated_at` | datetime | |

### Guest marker

A guest is a temporary user named `guest-<random id>` with the flag `is_guest` on the user model. `date_joined` is the creation time, the guest expires three hours later. All data the guest creates belongs to that user and is deleted with it after three hours. Guest users have no usable password.

## Authentication

- Django session authentication. The frontend fetches a CSRF cookie before the first write.
- Login attempts are rate limited per IP with DRF throttling; the counters live in the database cache (ADR 0011).
- There is no registration endpoint. I create my own account through the Django admin.

## Guest access

1. "Log in as guest" creates a new temporary guest user with its own guest ID, fills it with sample data and starts a session.
2. The guest session expires after three hours. Every request from a guest older than three hours is rejected, even before cleanup has run.
3. Logging out deletes the guest account immediately.
4. A management command runs every hour and deletes all expired guests, together with their data.
5. Limits: 5 guest logins per IP and hour, and per guest 50 applications, 50 notes and 30 watchlist entries. The sample data counts. Reaching a limit returns `429` and creates nothing, also for `convert`.
6. Sample data: seven applications covering every status, three notes and three watchlist entries, with dates relative to the day of the login. One application is due for a follow-up and two have an appointment in the next week.

The cleanup runs as `python manage.py delete_expired_guests`.

Guests can't change a password or open the admin.

## Frontend

- Standalone components, signals, OnPush change detection, lazy-loaded routes
- One service per resource for API access
- Pages: login, applications, watchlist, PDF overview
- Summary figures, filters and sorting are computed in the browser from the loaded list
- All texts in German and English
- PDF through the browser's print dialog with its own print stylesheet

## Deployment

Comes after the first deployment.
