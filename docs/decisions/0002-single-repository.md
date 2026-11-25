# 2. One repository for backend and frontend

- Status: Accepted
- Date: 2026-11-25

## Context

I build backend and frontend myself, and they usually change together. A new field touches the model, the serializer, the API docs and the form.

## Decision

Both live in this repository, in `backend/` and `frontend/`. The docs are in `docs/`.

## Consequences

- One pull request can cover a feature from start to finish.
- Everything about the project is in one place.
- Each part still has its own dependencies and tooling.
