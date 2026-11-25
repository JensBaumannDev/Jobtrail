# 3. No public registration

- Status: Accepted
- Date: 2026-11-25

## Context

I built Jobtrail for my own job search. If anyone could register, I would be storing other people's application data, including contact names and salary expectations. That comes with legal duties and support I don't want to take on for a personal project.

## Decision

There is no registration. I create my own account through the Django admin. Everyone else can try the app with the guest login (ADR 0004).

## Consequences

- No emails needed: no verification, no password reset by email.
- I'm not responsible for other people's data in the long run.
- If I forget my password, I reset it on the server with `manage.py changepassword`.
- Opening the app to others later would mean registration, email, account deletion and a new privacy policy.
