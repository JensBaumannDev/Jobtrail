# 12. Cap on active guests

- Status: Accepted
- Date: 2026-11-26

## Context

Guest logins are limited per IP (ADR 0011). With IPv6 one person often gets a whole /64 network, so every request can come from a new address. Many machines together could create guests without end and fill the database.

## Decision

At most 30 guests can be active at the same time. Only guests younger than three hours count. When the cap is reached, the guest login returns `503` and the login page says the demo is busy. The cap comes from `GUEST_MAX_ACTIVE`.

The rate limit counts IPv6 addresses per /64 network instead of per single address.

## Consequences

- The data guests can create has a fixed upper bound, about 15 MB in the worst case.
- Rotating addresses inside one IPv6 network doesn't get around the per-IP limit.
- On a very busy day a real visitor may have to wait until a guest expires. The site isn't listed on search engines and mostly recruiters visit it, so that should hardly happen. I can raise the cap on the server without a code change.
- People sharing one IPv6 network also share the 5 guest logins per hour.
