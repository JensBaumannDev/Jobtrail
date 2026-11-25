---
name: record-decision
description: Use when a real technical or product decision is made (stack, auth, data handling, architecture, anything with a real alternative that is hard to change later) to record it as an ADR.
---

# Record a decision (ADR)

1. **Is it a decision?** Only if there was a real alternative and it is hard to change later. Colors, names of variables or icons are not ADRs.
2. **File**: `docs/decisions/NNNN-short-kebab-title.md`, next free number, four digits.
3. **Format** (English, 15–25 lines, first person, plain and short):

   ```markdown
   # N. Title as a statement

   - Status: Proposed | Accepted | Superseded by NNNN
   - Date: YYYY-MM-DD

   ## Context
   What problem or situation made a decision necessary.

   ## Decision
   What I do.

   ## Consequences
   What gets easier, what gets harder, what I accept.
   ```

4. **Never delete or rewrite an accepted ADR.** If a decision changes, write a new ADR and set the old one's status to `Superseded by NNNN`.
5. Add the ADR to the list in `docs/decisions/README.md`.
6. Tell the user in one sentence (in German) which decision was recorded, so they can explain it in an interview.
