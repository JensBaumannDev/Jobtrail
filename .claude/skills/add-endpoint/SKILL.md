---
name: add-endpoint
description: Use when adding a new backend resource, endpoint or action to the Django REST Framework API (tests first, then model, serializer, viewset, route).
---

# Add a backend endpoint

Always test-first: red, green, refactor. Work in small cycles, one behaviour at a time.

1. **List the cases** before writing any code: go through the checklist below and write down every case that applies to this endpoint. Skip a case only when it really can't happen for this endpoint, and say why in the handover.
2. **Write the tests first** in the resource's own file (`tests/test_<resource>.py`). Group them in classes per behaviour (`TestCreateApplication`, `TestApplicationIsolation`). Build data and log in through helpers (`tests/helpers.py`, `conftest.py`) so each test stays short. One case per test, with a name that says the case (`test_website_without_scheme_gets_https`).
3. **Red**: run only this file, `docker compose exec backend pytest <path>/tests/test_<resource>.py -q`, and confirm the new tests fail for the expected reason. Do not run the full suite here.
4. **Green**: write the minimum code to make the failing tests pass:
   - **Model**: add or change the model in the right app. Every user-owned model has `user = ForeignKey(User, on_delete=CASCADE)`. Create the migration.
   - **Serializer**: field validation lives here. Required fields, URL normalization, length limits.
   - **ViewSet**: `get_queryset()` returns only `request.user`'s objects, with `select_related` / `prefetch_related` where nested data is returned; `perform_create()` sets `user=self.request.user`; guests hit the per-guest limits (ADR 0004), checked here, not in the frontend; multi-step writes in `transaction.atomic()`.
   - **Route**: register the viewset or action in the router.
5. **Refactor** with the tests green: every method at most 14 lines, the file at most 400 lines; move logic into clearly named helpers or a service module. Rerun only this file, `--lf` after a failure.
6. Repeat from step 1 for the next behaviour.
7. **Docs**: update `docs/api.md` (method, path, purpose, example request and response).
8. If a real decision was made along the way, record it with the `record-decision` skill.

## Test checklist

### Success

- `GET` list: status 200, only the user's objects, in the documented order, every documented field present with the right type
- `GET` list when the user has no objects: 200 with `[]`
- `GET` detail: 200 with the exact body
- `POST` with only the required fields: 201, defaults filled in, object in the database with `user` set to the logged-in user
- `POST` with every field filled: 201, every value stored and returned
- `PATCH` of a single field: 200, only that field changed, all other fields unchanged in the database, `updated_at` changed, `created_at` unchanged
- `PATCH` with an empty body: 200, nothing changed
- `DELETE`: 204, empty body, object gone from the database, related objects deleted or kept as documented
- `DELETE` of an already deleted object: 404
- `PUT` if it isn't offered: 405

### Required fields

For every required field, a separate test each:

- field left out: 400 with an error under that field name
- empty string `""`: 400
- only spaces `"   "`: 400
- `null`: 400
- on `PATCH`: setting a required field to `""` is rejected, leaving it out is fine

### Text fields

- value with exactly the maximum length: accepted
- value one character over the maximum: 400 with an error under that field
- leading and trailing spaces are stripped before saving
- umlauts, emoji and characters like `<script>` are stored and returned unchanged (no HTML escaping in the API)
- optional field left out: stored as `""`, returned as `""`, never `null`

### URL fields

- `example.com` becomes `https://example.com/`
- `http://example.com` stays `http`
- `https://example.com/jobs/42?ref=x` keeps path and query
- `EXAMPLE.COM` keeps working (host is not case sensitive)
- `ftp://example.com`, `javascript:alert(1)`, `mailto:a@b.de`, `file:///etc/passwd`: 400
- plain text without a dot (`example`), spaces inside (`exa mple.com`): 400
- exactly 500 characters accepted, 501 rejected
- optional URL left out or `""`: stored as `""`

### Choice fields

- every valid value once (parametrize over all choices)
- unknown value (`ghosted`), wrong case (`Offer`), the label instead of the key (`Not applied`): 400
- left out on `POST`: the documented default

### Date fields

- valid date `2026-11-27`: stored and returned in the same format
- impossible date `2026-02-30`: 400
- wrong format `27.11.2026`, `2026/11/27`, a datetime string: 400
- `null` on an optional date: accepted, returned as `null`
- dates in the past and in the future are both accepted unless the rule says otherwise
- automatic dates (`applied_on`, `responded_on`): set on the first matching status change, not overwritten on later changes, not changed when the status goes back, read-only when sent by the client

### Wrong input shape

- body is not JSON: 400
- body is a list instead of an object: 400
- number or boolean where text is expected: 400
- object or list where text is expected: 400
- unknown fields (`"is_admin": true`): ignored, not stored
- read-only fields sent (`id`, `user`, `created_at`, `updated_at`): ignored, the server value stays
- `user` set to another user's id: ignored, object belongs to the logged-in user

### Authentication and CSRF

- not logged in: 401 on every method and every action (parametrize over them), and the `WWW-Authenticate` header is set
- logged in but write without CSRF token (client with `enforce_csrf_checks=True`): 403, nothing changed in the database
- session of a deleted user: 401

### Isolation between users

For another user's object, a separate test each:

- `GET` detail: 404
- `PATCH`: 404, object unchanged in the database
- `DELETE`: 404, object still in the database
- every custom action (`convert`, nested `notes`): 404, nothing created
- `GET` list: the other user's objects never show up, also not nested (notes of foreign applications)
- creating a nested object under a foreign parent (`POST /api/applications/{foreign id}/notes/`): 404, nothing created

### Guests

- a guest sees only the guest's own sample data and objects, not mine and not another guest's
- a guest reaching the limit (applications, notes, watchlist entries): 429, nothing created; one below the limit still works
- a guest older than 3 hours: 401 on every endpoint, even before the cleanup ran (test at 2:59:59 and 3:00:01 with frozen time)
- deleting a guest deletes all the guest's objects, mine stay untouched

### Non-existing objects

- id that never existed: 404
- id that isn't a number (`/api/applications/abc/`): 404

### Transactions and side effects

- multi-step writes (`convert`): every step checked in the database (new object, moved data, deleted source)
- a failure in the middle (patch one step to raise): nothing changed, source still there, no half-created object
- counts before and after (`Model.objects.count()`) for create and delete

### Queries

- list with several objects and nested data: `django_assert_max_num_queries` with a fixed number, the same for 1 and for 10 objects

### Bugs

- every bug fix starts with a test that fails because of the bug
