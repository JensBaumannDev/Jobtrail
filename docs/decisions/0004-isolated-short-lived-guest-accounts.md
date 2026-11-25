# 4. Temporary guest users

- Status: Accepted
- Date: 2026-11-25

## Context

Recruiters and other visitors should be able to try the app without an account. With one shared demo account, visitors would see and change each other's entries, and whatever they type would stay in the database.

## Decision

Every guest login creates a temporary guest user with its own guest ID. Everything the guest creates is stored under that ID for 3 hours and then deleted. The guest starts with sample data and has no usable password, so nobody can log in to that user again.

- After 3 hours every request from the guest is rejected, even if the cleanup hasn't run yet.
- Logging out deletes the guest right away.
- A management command runs every hour and deletes expired guests. Their data goes with them.
- Guest logins are limited per IP and hour, and each guest can only create a limited number of applications, notes and watchlist entries.
- Guests can't change a password or open the admin.

## Consequences

- A guest never sees data of another guest or mine.
- Demo data is gone after a few hours.
- Nobody can use the demo to fill up the database.
- I need a scheduled job on the server and tests for isolation, expiry, cleanup and limits.
