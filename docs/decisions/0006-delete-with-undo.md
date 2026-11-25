# 6. Delete with undo instead of a confirmation dialog

- Status: Proposed
- Date: 2026-11-25

## Context

Confirmation dialogs get in the way every time, and most people click them away without reading. A wrong delete should still be easy to take back.

## Decision

Deleting removes the item from the view right away and shows a toast with "Undo" for six seconds. The `DELETE` request only goes out after that. Clicking "Undo" cancels it.

## Consequences

- Deleting is fast, and mistakes can be undone.
- No extra endpoint or database fields.
- If the tab is closed within the six seconds, the item would stay. To avoid that, the frontend sends pending deletes when the page is hidden.
- If the app is open in two tabs, the other tab still shows the item until it reloads.
