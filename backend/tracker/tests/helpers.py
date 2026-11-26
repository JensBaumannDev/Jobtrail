from django.contrib.auth import get_user_model

from tracker.models import Application, Note, WatchItem


def create_user(username='jens', **fields):
    return get_user_model().objects.create_user(username=username, password='test-password-123', **fields)


def create_application(user, **fields):
    values = {'company': 'Example GmbH', 'website': 'https://example.com/', **fields}
    return Application.objects.create(user=user, **values)


def create_note(application, **fields):
    values = {'title': 'First call', 'text': 'Talked to the team lead.', **fields}
    return Note.objects.create(application=application, **values)


def create_watch_item(user, **fields):
    values = {'company': 'Watched AG', 'website': 'https://watched.example/', **fields}
    return WatchItem.objects.create(user=user, **values)
