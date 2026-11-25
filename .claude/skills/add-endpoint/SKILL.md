---
name: add-endpoint
description: Use when adding a new backend resource, endpoint or action to the Django REST Framework API (tests first, then model, serializer, viewset, route).
---

# Add a backend endpoint

Always test-first: red, green, refactor. Work in small cycles, one behaviour at a time.

1. **Write the tests first** in the resource's own file (`tests/test_<resource>.py`). Build data and log in through helpers (`tests/helpers.py`, `conftest.py`) so each test stays short. Cover at least:
   - success for each method
   - validation errors
   - unauthenticated request is rejected
   - another user's objects are invisible (404) and cannot be changed
2. **Red**: run only this file, `docker compose exec backend pytest <path>/tests/test_<resource>.py -q`, and confirm the new tests fail for the expected reason. Do not run the full suite here.
3. **Green**: write the minimum code to make the failing tests pass:
   - **Model**: add or change the model in the right app. Every user-owned model has `user = ForeignKey(User, on_delete=CASCADE)`. Create the migration.
   - **Serializer**: field validation lives here. Required fields, URL normalization, length limits.
   - **ViewSet**: `get_queryset()` returns only `request.user`'s objects, with `select_related` / `prefetch_related` where nested data is returned; `perform_create()` sets `user=self.request.user`; guests hit the per-guest limits (ADR 0004), checked here, not in the frontend; multi-step writes in `transaction.atomic()`.
   - **Route**: register the viewset or action in the router.
4. **Refactor** with the tests green: every method at most 14 lines, the file at most 400 lines; move logic into clearly named helpers or a service module. Rerun only this file, `--lf` after a failure.
5. Repeat from step 1 for the next behaviour.
6. **Docs**: update `docs/api.md` (method, path, purpose, example request and response).
7. If a real decision was made along the way, record it with the `record-decision` skill.
