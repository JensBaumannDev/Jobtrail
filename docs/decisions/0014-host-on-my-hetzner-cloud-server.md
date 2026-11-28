# 14. Host on my existing Hetzner Cloud server

- Status: Accepted
- Date: 2026-11-28

## Context

Jobtrail needs a place to run: Django, PostgreSQL, the built Angular app, HTTPS and an hourly job that deletes expired guests. I could rent a new server, use a platform service like Render or Fly.io, or use the Hetzner Cloud server that already runs my other projects.

## Decision

Jobtrail runs on my existing Hetzner Cloud server at `jobtrail.jensbaumann.com`, next to my other projects. The subdomain has only an A record (IPv4), like my other subdomains. Frontend and API are served under this one subdomain.

## Consequences

- No extra server or platform to pay for and maintain.
- I control the hourly cleanup, the database and the backups myself.
- Jobtrail shares CPU, memory and disk with my other projects, so its containers need clear names, their own network and no fixed host ports besides the reverse proxy.
- Without an AAAA record every visitor comes over IPv4. The IPv6 /64 grouping in the guest login limit (ADR 0012) only matters if I add IPv6 later.
- Server updates, firewall and monitoring stay my job.
