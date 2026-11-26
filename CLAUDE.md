# Jobtrail

Jobtrail is my personal job application tracker, built for my own job search. It runs at a subdomain of jensbaumann.com. There is no public registration: I log in with my own account, everyone else uses the guest demo.

Design and feature reference: the mockup at https://claude.ai/artifact/2GCUydUMsZLWWZSBxqxw4T

## Folder layout

This folder is the public git repository: `backend/`, `frontend/`, `docs/`, `README.md`, `CLAUDE.md` and `.claude/skills/`.

- `../Organisation/`: private planning outside the repository (`planning.md`: milestones, what to decide before each, status)

Never run `git init` or commit outside this folder. Never copy content from `../Organisation/` into the repository.

## Stack

- Backend: Django, Django REST Framework, PostgreSQL, pytest with pytest-django and pytest-cov
- Frontend: Angular 21, TypeScript, SCSS, ngx-translate (DE/EN), installable as PWA
- Auth: Django session authentication with CSRF
- Decisions and their reasons live in `docs/decisions/`. Read the relevant ADR before changing anything it covers.

## Commands

```bash
# backend and database run in Docker (from the repository root)
docker compose up -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createcachetable           # once per database, for the login rate limit
docker compose exec backend python manage.py delete_expired_guests      # runs hourly on the server
docker compose exec backend pytest <path>                              # one file while working
docker compose exec backend pytest --cov --cov-report=term-missing     # full suite once

# frontend (in frontend/)
npm start
npm run build
npx ng test --watch=false
```

The local `backend/.venv` only holds Django, DRF, django-cors-headers and pytest for the editor. The PostgreSQL driver only runs inside Docker.

## Testing

- The backend is always written test-first (TDD): write a failing test, run it and see it fail, write the minimum code to make it pass, then refactor with the tests green. No backend code without a failing test that asks for it.
- While working on one endpoint or component, run only its tests: one file, one class (`::`), `-k <name>`, or `--lf` after a failure.
- Never run the whole suite after every change. Run the full suite with coverage once, when a larger step is done or before a commit: `pytest --cov=<app> --cov-report=term-missing` (inside the backend container, with `--reuse-db`).
- Keep backend tests split per resource (`test_applications.py`, `test_notes.py`, `test_watchlist.py`, `test_auth.py`, `test_guests.py`).
- Test every situation that can happen, not only the happy path. Before writing code, list the cases of the checklist in the `add-endpoint` skill (backend) or the `add-component` skill (frontend) that apply, and write one test per case. A case that doesn't apply is skipped on purpose, not forgotten.
- Every endpoint is tested for at least:
  - success for each method, with the exact status code and the exact response body (field names, normalized values, nested data)
  - each required field missing, empty and whitespace only
  - each length limit at exactly the limit (accepted) and one character over (rejected)
  - each choice field with every valid value and one unknown value
  - each URL field with `example.com`, `http://`, `https://`, `ftp://`, `javascript:` and plain text
  - each date field with a valid date, an invalid date (`2026-02-30`), a wrong format and `null` where allowed
  - read-only fields (`id`, `user`, `created_at`, `updated_at`, automatic dates) sent in the request and ignored
  - unknown fields ignored, wrong JSON types (number instead of text, list instead of object) rejected with 400
  - not logged in: 401 for every method
  - write without CSRF token: 403
  - another user's object: 404 on read, update, delete and every action, and the object is unchanged afterwards in the database
  - a guest: same isolation from me and from other guests, expired guest gets 401, guest limits reached gets 429
  - a non-existing id: 404
  - side effects checked in the database, not only in the response (counts, cascades, nothing half-written after a failed transaction)
  - number of queries for list endpoints with several objects (`django_assert_max_num_queries`), so N+1 shows up
- Every model is tested for defaults, choices, required fields, constraints, ordering, `__str__`, cascades on delete and admin registration.
- Dates and times are tested at their edges: today, yesterday, tomorrow, exactly 14 days, exactly 3 hours (guest expiry) one second before and after. Time is frozen in these tests, never taken from the real clock.
- A bug fix starts with a test that reproduces the bug.
- Line coverage is checked, but it isn't the goal: a line counts as tested only when a test asserts what it does.

## Product rules

- No registration endpoint, no registration UI. My account is created with the Django admin.
- Every guest login creates a temporary guest user with its own guest ID and sample data. Everything the guest creates is stored under that ID and deleted after 3 hours or on logout (ADR 0004).
- Every queryset is filtered by `request.user`. Nothing is ever shared between users.
- Website is required for applications and watchlist entries.
- Application statuses (keys in English, labels translated): `not_applied`, `awaiting_response`, `intro_call_scheduled`, `further_interview`, `offer`, `rejected_after_application`, `rejected_after_interview`.
- Delete happens without a confirm dialog, with an undo option in a toast.

## Size limits

Apply to all TypeScript and Python files, including tests:

- A file has at most 400 lines. Split it before it gets longer.
- A function or method has at most 14 lines. Extract steps into well-named helpers.
- Names are clear and simple and say what something does (`createGuestAccount`, `filter_expired_guests`), no abbreviations.

## Backend

- Clear and simple names for classes and methods.
- Tests use helper functions (for example `create_application(user, **fields)`, `login_as_guest(client)`) in a shared `tests/helpers.py` or fixtures in `conftest.py`, so each test stays short and readable.
- One Django app per domain area (`accounts`, `tracker`). API code lives in `<app>/api/` (`serializers.py`, `views.py`, `urls.py`), tests in `<app>/tests/` with one file per resource and shared helpers in `tests/helpers.py`.
- ViewSets with `get_queryset` filtered by user and `perform_create` setting the user, so another user's id always returns 404.
- Unauthenticated requests must return 401, not 403: use a `SessionAuthentication` subclass whose `authenticate_header()` returns a value. The frontend ends the session on 401.
- Validation in serializers, not in views.
- Avoid N+1 queries: `select_related` / `prefetch_related`.
- Settings from environment variables. No secrets, `.env` files or local databases in git.
- Multi-step writes (like converting a watchlist entry) run in `transaction.atomic()`.

## Frontend

- TypeScript strict, no `any` (use `unknown`), prefer inference when the type is obvious
- No comments in code
- Standalone components (don't set `standalone: true`), `ChangeDetectionStrategy.OnPush` everywhere
- Signals for state, `computed()` for derived state, `set`/`update` instead of `mutate`
- `input()` / `output()` instead of decorators, host bindings in the `host` object
- `@if` / `@for` / `@switch`, class and style bindings instead of `ngClass` / `ngStyle`
- Reactive forms, lazy-loaded routes
- Services: single responsibility, `providedIn: 'root'`, `inject()`
- All UI text in `public/i18n/de.json` and `en.json`, always update both

## SCSS

Structure:

```
src/styles/
├── abstracts/
│   ├── _functions.scss
│   ├── _index.scss
│   ├── _mixins.scss
│   └── _variables.scss
└── base/
    ├── _buttons.scss
    ├── _fonts.scss
    ├── _global.scss
    ├── _index.scss
    ├── _reset.scss
    └── _typography.scss
```

- Clean BEM: `block__element--modifier`, one block per component, no nesting deeper than the element level
- Clear, descriptive class names, no abbreviations (`application-row__status`, not `ar-st`)
- Work with variables: every color, size, radius, breakpoint and z-index comes from `_variables.scss`; no magic numbers in components
- Variables are named clearly and grouped with labelled sections in `_variables.scss` (colors, typography, spacing, radius, breakpoints, z-index)
- `@use` the abstracts in every component; `flex()` mixin for flexbox
- Sizes and spacing via `rem()`; raw `px` only for borders, outlines, shadows, blur, transforms, breakpoints
- Media queries at the bottom in `/* #region RESPONSIVE */ ... /* #endregion */`
- No `!important`, no `overflow: hidden` (use `overflow: clip`)

## Accessibility

- AXE clean, WCAG AA (focus, contrast, ARIA)
- Responsive down to 320px: no horizontal scrolling, nothing cut off or overlapping
- Min. font size 16px
- Respect `prefers-reduced-motion`

## Design

- Font Urbanist (400–700), self-hosted, body 500
- Colors: ink `#171a20`, text `#393c41`, labels `#5c5e62`, second heading line `#86868b`, lines `#e5e5e5`, surface `#f4f4f4`, blue `#0071e3` / `#0062c4`, dark button `#2c2c2e`
- Hero: black stage with glow `rgba(150, 165, 255, 0.22)` in light mode; in dark mode the page background runs through and the glow floats freely
- Same hero height on every page; headings in two lines (ink + grey), no trailing periods
- Radius 16 (surfaces), 10 (buttons); flat grey cards, no shadows, no hover lift
- One blue button per group, first; secondary is the dark button
- Status pills: grey (not applied), blue (awaiting response), yellow (intro call, further interview), green (offer), red (both rejections)
- Textareas can be resized to at most double their starting height
- Navigation with an opaque background, no transparency or blur
- Footer on every page with copyright, imprint and privacy links

## Git

- Branches `feature/*` / `fix/*`; commits like `feat(applications): ...`
- Every commit has a subject line and a body: a short bullet list of the main changes (what was added or changed, important rules, tests, docs). Rough details, no file-by-file list.
- Commit after each finished section, but only after the user has reviewed the changes and approved them. Show the changes first, then commit.
- Never push, never create a pull request, never merge. The user does that.
- Never add a "Co-Authored-By" line or any other AI attribution

## Docs

- Everything in the repository is written in English, factual and short.
- Docs read as if I wrote them: first person ("I build", "my own account"), plain everyday English, short sentences. No template phrasing, no "the owner", no bold lead-ins in every bullet, no references to other projects.
- Record every real decision as an ADR (use the `record-decision` skill).

## Skills

- `add-endpoint`: adding a backend resource or endpoint
- `add-component`: adding an Angular component
- `finish-step`: checks and commit at the end of a step
- `record-decision`: recording a decision as an ADR
