# 5. Session authentication instead of tokens

- Status: Proposed
- Date: 2026-11-25

## Context

Frontend and API run on the same subdomain. There is one real user (me), the short-lived guests and no other clients.

## Decision

I use Django's session authentication with CSRF protection. Before the first write the frontend fetches a CSRF cookie and sends the token in the `X-CSRFToken` header.

## Consequences

- No token in the browser storage, so an injected script can't steal it.
- Logout and guest expiry take effect on the server immediately.
- Angular has to handle CSRF, and the cookie settings (`Secure`, `HttpOnly`, `SameSite`) have to be right.
- A mobile app would need a different method later.
