# 13. Offline only the app shell, no API data

- Status: Accepted
- Date: 2026-11-28

## Context

Jobtrail becomes an installable PWA with a service worker. I had to decide what it keeps for offline use: only the app itself, or also my applications, notes and watchlist, so I could read and edit them without a connection and sync them later.

## Decision

The service worker caches only the app shell: HTML, JavaScript, CSS, fonts and icons. API responses are never cached. Without a connection the app still starts and shows a clear "no connection" message instead of an empty or endless loading state.

## Consequences

- The app starts fast and opens even offline.
- My data and guest data are never stored on a device. Nothing stale is shown, and logging out or a guest expiring leaves nothing behind.
- No sync logic and no conflicts between offline edits and the server.
- Without a connection I can't read or edit anything. For a tracker I use at my desk that is fine.
