---
name: add-component
description: Use when creating or substantially changing an Angular component, page or service in the frontend.
---

# Add an Angular component

1. **Check the rules** in `CLAUDE.md` (Frontend, SCSS, Accessibility, Design) before writing code.
2. **Component**:
   - standalone (no `standalone: true`), `ChangeDetectionStrategy.OnPush`
   - state as signals, derived state with `computed()`
   - `input()` / `output()`, host bindings in the `host` object
   - `@if` / `@for` / `@switch` in templates
   - reactive forms for anything with inputs
   - data access through a service (`providedIn: 'root'`, `inject()`), never `HttpClient` in the component
   - every function at most 14 lines, every file at most 400 lines, clear and simple names; split into child components or helpers before the limits are reached
3. **Text**: every visible string goes into `public/i18n/de.json` and `en.json`.
4. **SCSS**: clean BEM with descriptive class names, values from variables in `abstracts/_variables.scss` (add a clearly named variable instead of a magic number), `@use` abstracts, `rem()`, `flex()` mixin, media queries in the RESPONSIVE region at the bottom. No `!important`, no `overflow: hidden`.
5. **Accessibility**:
   - every control has a label or `aria-label`
   - visible focus state
   - contrast WCAG AA, min. 16px text
   - motion behind `prefers-reduced-motion`
6. **Compare with the mockup** for layout and behaviour.
7. **Test**: go through the checklist below, write down every case that applies, write the spec next to the component and run only that spec. Do not run the full test suite here. Skip a case only when it really can't happen for this component, and say why in the handover.

## Test checklist

### Rendering

- renders with typical data: every visible value is shown in the right place
- empty state: no data shows the empty message, not an empty table or list
- one item and many items (at least 20)
- optional values missing (`""`, `null`): no `null`, `undefined`, `NaN` or `Invalid Date` on screen, the placeholder is shown instead
- very long values (120 characters without spaces, long URLs): text wraps or is cut with an ellipsis, nothing overflows
- every status, work mode and plan once (loop over the constants), with the right pill color class and translated label

### Inputs and outputs

- every `input()` changed after the first render: the view updates (OnPush)
- every `output()` emits exactly once with the exact value on the matching user action, and doesn't emit on cancel or invalid input

### Forms

- initial values: defaults on create, the object's values on edit
- every required field empty and only spaces: error shown, submit doesn't emit
- every length limit: exactly at the limit valid, one over invalid
- URL fields: `example.com` valid, `ftp://x.de` and plain text invalid
- errors appear only after the field was touched or after submit, not on first render
- submit with valid data emits the exact payload (trimmed values, empty optional fields as `""`, dates as `YYYY-MM-DD`)
- submit while a request is running is blocked (no double submit)
- server error (400 with field errors): messages shown under the matching fields; other errors (500, network): general message, form keeps the input
- cancel resets the form and emits nothing

### Services and HTTP

Use `HttpTestingController`:

- exact method, URL and body for every call
- success: the signal or returned value has the new data
- 400, 404, 429, 500 and network error: each handled, the state stays consistent, the user sees a message
- 401: the session ends and the app goes to the login page
- list state after create, update and delete matches what the server returned

### Delete with undo

- delete removes the item from the view right away and shows the toast
- undo inside the time window brings the item back at the same position and sends no delete, or restores it
- toast timing out sends the delete exactly once
- deleting two items quickly: both are handled, neither undo restores the wrong item

### Filters, sort and summary (pure functions in `core/`)

- every filter alone, all combined, none set
- search: case insensitive, umlauts, leading and trailing spaces, no match
- sort ascending and descending for every key, items with missing values (no date, no location) at the end in both directions, equal values in a stable order
- summary figures with no applications, only `not_applied`, only rejections, and a mix
- date edges with a fixed today: appointment today, in exactly 7 days, in 8 days, yesterday; follow-up due at 13, 14 and 15 days without a response

### Language and theme

- texts come from the translation keys; switching between DE and EN changes them; dates and numbers are formatted for the active language
- every new key exists in both `de.json` and `en.json` (key sets are equal)

### Accessibility

- every control has an accessible name, every form field a connected label, error messages linked with `aria-describedby`
- keyboard: every action reachable with Tab and triggered with Enter or Space, Escape closes dialogs and panels, focus goes back to the trigger afterwards
- toasts and form errors are announced (`aria-live` or `role="alert"`)
- no animation when `prefers-reduced-motion` is set

### Bugs

- every bug fix starts with a spec that fails because of the bug
