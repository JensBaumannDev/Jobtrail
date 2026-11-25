# Scope

What version 1 does, and what I'm leaving out for now.

## Users

- Me: one account, created through the Django admin.
- Guests: anyone on the live demo. Each guest login creates a temporary user with sample data, deleted after three hours or on logout.
- Nobody can register through the app.

## In version 1

### Applications

- Create, edit and delete applications
- Fields: company, website (required), role, location, work mode (remote, hybrid, on site), status, date applied, next step, appointment date, job ad link, contact person, salary expectation
- Seven statuses: not applied, awaiting response, intro call scheduled, further interview, offer, rejected after application, rejected after interview
- Date applied and date of first response are set automatically when the status changes
- Summary: active applications, response rate, appointments in the next 7 days, follow-ups due (no response after 14 days)
- Applications by status
- Search, status filter, "remote only", "follow-up due"
- Sort by company, location, next appointment and status
- Details panel with facts and notes

### Notes

- Create, edit and delete notes on an application

### Watchlist

- Companies I'm interested in, with website (required), careers page, location, plan ("application planned" or "keep watching") and a note
- Turn an entry into an application; the note comes along

### PDF overview

- Choose title, sections (summary, status distribution, list), columns and statuses
- Live A4 preview, printed or saved as PDF through the browser

### General

- Undo for every delete
- German and English
- Light and dark mode
- Installable as a PWA
- Responsive down to 320 px, WCAG AA

## Not in version 1

- Public registration, password reset by email, deleting your own account
- Email or push reminders for appointments
- File uploads (CV, cover letters)
- Sharing data between users
- Importing job ads from a link
- Creating PDFs on the server
- Native mobile or desktop apps
