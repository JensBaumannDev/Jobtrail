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
7. **Test**: write the spec next to the component and run only that spec. Do not run the full test suite here.
