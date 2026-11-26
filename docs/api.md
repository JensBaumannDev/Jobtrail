# API

All endpoints live under `/api/`. Requests and responses use JSON. Authentication uses the session cookie; every request that changes data needs the `X-CSRFToken` header.

All endpoints except `csrf`, `login` and `guest` need a logged-in user. Everyone only sees their own data. Asking for someone else's object returns `404`.

> This is the plan. I update the examples as I build the endpoints.

## Auth

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/csrf/` | Set the CSRF cookie |
| POST | `/api/auth/login/` | Log in with username and password |
| POST | `/api/auth/guest/` | Log in as a guest; creates a new temporary guest user |
| POST | `/api/auth/logout/` | Log out; a guest is deleted right away |
| GET | `/api/auth/me/` | Current user |
| POST | `/api/auth/password/change/` | Change own password (not for guests) |

`GET /api/auth/me/`

```json
{
  "username": "jens",
  "is_guest": false,
  "expires_at": null
}
```

For a guest, `is_guest` is `true` and `expires_at` is the time the guest gets deleted.

## Applications

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/applications/` | All applications of the user, including notes |
| POST | `/api/applications/` | Create |
| GET | `/api/applications/{id}/` | One application |
| PATCH | `/api/applications/{id}/` | Update, including status only |
| DELETE | `/api/applications/{id}/` | Delete, notes included |

`POST /api/applications/`

```json
{
  "company": "Example GmbH",
  "website": "example.com",
  "role": "Fullstack Developer",
  "location": "Hamburg",
  "work_mode": "hybrid",
  "status": "awaiting_response",
  "next_step": "Technical interview",
  "next_step_on": "2026-12-03",
  "job_ad_url": "example.com/jobs/42",
  "contact": "Jane Doe, Team Lead",
  "salary_expectation": "52,000 EUR gross"
}
```

Only `company` and `website` are required. Left-out fields get their defaults: role `Fullstack Developer`, work mode `remote`, status `not_applied`, empty text for the rest.

Response `201`: the created application with `id`, the normalized `website` (`https://example.com/`), `applied_on`, `responded_on`, `notes: []`, `created_at` and `updated_at`.

- `website` and `job_ad_url` accept `http` and `https` only. Input without a scheme gets `https://`.
- `applied_on` and `responded_on` are read-only. The server sets them to today on the first matching status change and never overwrites them.
- `PUT` is not supported, use `PATCH`.
- Text fields are trimmed. Numbers, booleans, lists or objects in a text field return `400`.

Validation errors return `400` with one list of messages per field.

## Notes

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/applications/{id}/notes/` | Add a note to an application |
| PATCH | `/api/notes/{id}/` | Update a note |
| DELETE | `/api/notes/{id}/` | Delete a note |

Notes are listed inside each application, newest update first, so there is no separate list or detail endpoint.

`POST /api/applications/{id}/notes/`

```json
{
  "title": "First call",
  "text": "Talked to the team lead."
}
```

Response `201`:

```json
{
  "id": 7,
  "title": "First call",
  "text": "Talked to the team lead.",
  "created_at": "2026-11-27T10:15:00+01:00",
  "updated_at": "2026-11-27T10:15:00+01:00"
}
```

- A note needs a title or a text. Without both the response is `400` with `non_field_errors`.
- Title up to 120 characters, text up to 5000. Both are trimmed, line breaks inside the text stay.
- A note can't be moved to another application. An `application` field in the body is ignored.
- A note of someone else's application returns `404`.

## Watchlist

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/watchlist/` | All watchlist entries |
| POST | `/api/watchlist/` | Add a company |
| PATCH | `/api/watchlist/{id}/` | Update |
| DELETE | `/api/watchlist/{id}/` | Remove |
| POST | `/api/watchlist/{id}/convert/` | Turn the entry into an application |

`POST /api/watchlist/`

```json
{
  "company": "Acme",
  "website": "acme.example",
  "careers_url": "acme.example/jobs",
  "location": "Hamburg",
  "plan": "watch",
  "note": "Ask about the frontend team."
}
```

Response `201`: the entry with `id`, normalized `website` and `careers_url`, `created_at` and `updated_at`. Only `company` and `website` are required, `plan` defaults to `apply`. URLs and text fields follow the same rules as for applications.

`convert` runs in one transaction. It creates an application with status `not_applied`, moves the entry's note over, deletes the watchlist entry and returns the new application (`201`).

- Company, website and location are copied. The careers page becomes `job_ad_url`.
- A non-empty note becomes the application's first note (text only, no title).
- The request body is ignored.
- If any step fails, nothing is changed: no application, no note, the entry stays.
- Converting the same entry twice returns `404` the second time.

## Errors

| Status | Meaning |
|---|---|
| 400 | Validation failed |
| 401 | Not logged in, or guest session expired |
| 403 | Missing CSRF token, or not allowed (for example a guest changing the password) |
| 404 | Not found, or belongs to another user |
| 429 | Too many login or guest login attempts, or a guest limit reached |
