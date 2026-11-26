from django.contrib.auth import get_user_model

from tracker.models import Application, Note, WatchItem

APPLICATIONS_URL = '/api/applications/'
WATCHLIST_URL = '/api/watchlist/'
TEST_PASSWORD = 'test-password-123'


def create_user(username='jens', **fields):
    return get_user_model().objects.create_user(username=username, password=TEST_PASSWORD, **fields)


def create_application(user, **fields):
    values = {'company': 'Example GmbH', 'website': 'https://example.com/', **fields}
    return Application.objects.create(user=user, **values)


def create_note(application, **fields):
    values = {'title': 'First call', 'text': 'Talked to the team lead.', **fields}
    return Note.objects.create(application=application, **values)


def create_watch_item(user, **fields):
    values = {'company': 'Watched AG', 'website': 'https://watched.example/', **fields}
    return WatchItem.objects.create(user=user, **values)


def application_url(application_id):
    return f'{APPLICATIONS_URL}{application_id}/'


def notes_url(application_id):
    return f'{application_url(application_id)}notes/'


def note_url(note_id):
    return f'/api/notes/{note_id}/'


def watch_item_url(watch_item_id):
    return f'{WATCHLIST_URL}{watch_item_id}/'


def convert_url(watch_item_id):
    return f'{watch_item_url(watch_item_id)}convert/'


def watch_item_payload(**fields):
    return {'company': 'Watched AG', 'website': 'watched.example', **fields}


def application_payload(**fields):
    return {'company': 'Example GmbH', 'website': 'example.com', **fields}


def full_application_payload():
    return application_payload(
        role='Backend Developer',
        location='Hamburg',
        work_mode='hybrid',
        status='awaiting_response',
        next_step='Technical interview',
        next_step_on='2026-12-03',
        job_ad_url='example.com/jobs/42',
        contact='Jane Doe, Team Lead',
        salary_expectation='52,000 EUR gross',
    )


def stored_values(application, fields):
    application.refresh_from_db()
    return {field: getattr(application, field) for field in fields}
