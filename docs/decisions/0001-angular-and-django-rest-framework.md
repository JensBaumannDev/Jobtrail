# 1. Angular frontend with a Django REST Framework API

- Status: Accepted
- Date: 2026-11-25

## Context

The app has several pages, a lot of forms, expandable details, undo, filters and a live PDF preview. I also want it to show the whole way from database to UI: a separate API, a single-page frontend, login and tests.

## Decision

I build the frontend with Angular 21 and the backend as a JSON API with Django and Django REST Framework. The data lives in PostgreSQL.

## Consequences

- API and UI are separate, and I can test each on its own.
- Django gives me the admin, migrations, validation and permissions. With DRF viewsets the CRUD endpoints stay small.
- Angular's routing, reactive forms and signals fit an app of this size well.
- I have two toolchains to set up and deploy instead of one.
