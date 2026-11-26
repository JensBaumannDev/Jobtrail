---
name: finish-step
description: Use when a section is finished; runs the full checks once, hands the changes to the user for review and commits after approval.
---

# Finish a section

1. **Rules check** on every changed file:
   - files at most 400 lines, functions at most 14 lines
   - clear, simple names
   - SCSS: clean BEM, variables instead of magic numbers, no `!important`, no `overflow: hidden`, media queries in the RESPONSIVE region
2. **Full checks, once each**:
   - backend: `docker compose exec backend pytest --cov --cov-report=term-missing`
   - frontend: unit tests and `ng build`
   - frontend lint, if set up
   - **test gap check**: go through the checklist in `add-endpoint` (backend) or `add-component` (frontend) for every changed endpoint, model and component, and compare it with the tests that exist. Write the missing tests now, before the handover. Every line the coverage report lists as missing either gets a test or a reason in the handover.
3. If something fails, fix it and rerun **only the failing tests** (`--lf`). Run the full suite again only once at the very end.
4. **Docs**: make sure `docs/api.md`, `architecture.md` and new ADRs match what was built.
5. **Planning**: update the status in `../Organisation/planning.md`.
6. **Hand over for review** (in German): what changed, test and coverage result, which checklist cases are covered and which were skipped on purpose (with the reason), which files to review first, and the proposed commit message. Then wait.
7. **Commit only after the user approved the review**:
   - branch `feature/*` or `fix/*`, never commit directly to `main`
   - message like `feat(applications): add status filter`, followed by a blank line and a short bullet list of the main changes (rough details, no file-by-file list); show the full message in the handover
   - no "Co-Authored-By" line, no AI attribution
8. **Never push, create a pull request or merge.** The user does that.
