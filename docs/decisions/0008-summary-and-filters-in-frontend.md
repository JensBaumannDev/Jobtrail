# 8. Summary, filters and sorting in the frontend

- Status: Proposed
- Date: 2026-11-25

## Context

I'll have a few dozen applications, a few hundred at most. The list page shows summary figures, a status distribution, search, filters and sorting, and all of it updates while typing.

## Decision

The API returns all applications in one request. The frontend calculates figures, filters and sorting with signals.

## Consequences

- Instant feedback while typing, no request per filter change.
- Fewer endpoints and no pagination.
- Rules like "follow-up due" live in the frontend, so they need unit tests there.
- With thousands of entries I would have to move filtering and pagination to the server.
