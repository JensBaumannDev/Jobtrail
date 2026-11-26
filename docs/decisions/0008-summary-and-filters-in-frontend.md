# 8. Summary, filters and sorting in the frontend

- Status: Accepted
- Date: 2026-11-25

## Context

I'll have a few dozen applications, a few hundred at most. The list page shows summary figures, a status distribution, search, filters and sorting, and all of it updates while typing.

## Decision

The API returns all applications in one request. The frontend calculates figures, filters and sorting with signals.

## Consequences

- Instant feedback while typing, no request per filter change.
- Fewer endpoints and no pagination.
- Rules like "follow-up due" live in the frontend, so they need unit tests there.
- A test keeps the number of database queries for the list the same for 1 and for 10 applications, so the one big request stays cheap.
- At around 1,000 applications, or when the list request gets noticeably slow, I move filtering and pagination to the server.
