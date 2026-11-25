# 9. Company website is required

- Status: Accepted
- Date: 2026-11-25

## Context

The company website is the link I use most: to prepare for a call, look up the team or check open positions. An entry without it is less useful.

## Decision

Applications and watchlist entries need a website. Input like `example.com` becomes `https://example.com/`. The company name in the list links to the website.

## Consequences

- Every entry is one click away from the company.
- Adding an entry takes one more field.
- Only `http` and `https` URLs are accepted.
