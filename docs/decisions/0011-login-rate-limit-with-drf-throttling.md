# 11. Login rate limit with DRF throttling

- Status: Accepted
- Date: 2026-11-26

## Context

The login is open to everyone, so someone could try passwords for my account in a loop. Guest logins need a limit per IP too (ADR 0004).

## Decision

I use the throttling that comes with Django REST Framework: 10 login attempts and 5 guest logins per IP and hour. The counters live in Django's database cache, so every server process sees the same numbers. The client IP comes from `REMOTE_ADDR`; `X-Forwarded-For` is only trusted for the number of proxies set in `DJANGO_NUM_PROXIES`.

## Consequences

- No extra package, the rates sit in the settings.
- Every attempt counts, also successful ones. Ten logins in an hour from one IP is plenty for me.
- There is no lock per username. Someone with many IPs gets more tries, which a strong password has to cover.
- The cache table needs `python manage.py createcachetable` once per database.
- Behind a proxy `DJANGO_NUM_PROXIES` has to be set, otherwise every request has the proxy's IP.
