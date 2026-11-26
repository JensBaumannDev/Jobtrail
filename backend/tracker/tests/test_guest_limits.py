import pytest

from accounts.tests.helpers import create_guest
from tracker.models import Application, Note, WatchItem

from .helpers import (
    APPLICATIONS_URL,
    WATCHLIST_URL,
    application_payload,
    convert_url,
    create_application,
    create_watch_item,
    notes_url,
    watch_item_payload,
)

pytestmark = pytest.mark.django_db

APPLICATION_LIMIT = 50
NOTE_LIMIT = 50
WATCH_ITEM_LIMIT = 30
LIMIT_MESSAGE = {'detail': 'The demo limit is reached. Delete something first.'}


@pytest.fixture
def guest(frozen_now):
    return create_guest()


@pytest.fixture
def guest_client(client_for, guest):
    return client_for(guest)


def fill_applications(user, amount):
    Application.objects.bulk_create(
        Application(user=user, company=f'Company {number}', website='https://example.com/') for number in range(amount)
    )
    return Application.objects.filter(user=user).first()


def fill_notes(application, amount):
    Note.objects.bulk_create(Note(application=application, title=f'Note {number}') for number in range(amount))


def fill_watch_items(user, amount):
    WatchItem.objects.bulk_create(
        WatchItem(user=user, company=f'Company {number}', website='https://example.com/') for number in range(amount)
    )


class TestApplicationLimit:
    def test_guest_can_create_the_last_allowed_application(self, guest_client, guest):
        fill_applications(guest, APPLICATION_LIMIT - 1)
        assert guest_client.post(APPLICATIONS_URL, application_payload()).status_code == 201

    def test_guest_at_the_limit_gets_429_and_nothing_is_created(self, guest_client, guest):
        fill_applications(guest, APPLICATION_LIMIT)
        response = guest_client.post(APPLICATIONS_URL, application_payload())
        assert response.status_code == 429
        assert response.json() == LIMIT_MESSAGE
        assert Application.objects.count() == APPLICATION_LIMIT

    def test_guest_can_create_again_after_deleting(self, guest_client, guest):
        first = fill_applications(guest, APPLICATION_LIMIT)
        guest_client.delete(f'{APPLICATIONS_URL}{first.id}/')
        assert guest_client.post(APPLICATIONS_URL, application_payload()).status_code == 201

    def test_guest_at_the_limit_can_still_update(self, guest_client, guest):
        first = fill_applications(guest, APPLICATION_LIMIT)
        response = guest_client.patch(f'{APPLICATIONS_URL}{first.id}/', {'location': 'Kiel'})
        assert response.status_code == 200

    def test_my_account_has_no_limit(self, api_client, user):
        fill_applications(user, APPLICATION_LIMIT)
        assert api_client.post(APPLICATIONS_URL, application_payload()).status_code == 201

    def test_another_guests_data_does_not_count(self, guest_client, frozen_now):
        fill_applications(create_guest('guest-other'), APPLICATION_LIMIT)
        assert guest_client.post(APPLICATIONS_URL, application_payload()).status_code == 201


class TestNoteLimit:
    def test_guest_can_create_the_last_allowed_note(self, guest_client, guest):
        application = fill_applications(guest, 1)
        fill_notes(application, NOTE_LIMIT - 1)
        assert guest_client.post(notes_url(application.id), {'title': 'Last'}).status_code == 201

    def test_notes_count_across_all_applications(self, guest_client, guest):
        fill_applications(guest, 2)
        first, second = Application.objects.filter(user=guest)
        fill_notes(first, NOTE_LIMIT)
        response = guest_client.post(notes_url(second.id), {'title': 'Too many'})
        assert response.status_code == 429
        assert response.json() == LIMIT_MESSAGE
        assert Note.objects.count() == NOTE_LIMIT

    def test_my_account_has_no_note_limit(self, api_client, user):
        application = create_application(user)
        fill_notes(application, NOTE_LIMIT)
        assert api_client.post(notes_url(application.id), {'title': 'More'}).status_code == 201


class TestWatchItemLimit:
    def test_guest_can_create_the_last_allowed_watch_item(self, guest_client, guest):
        fill_watch_items(guest, WATCH_ITEM_LIMIT - 1)
        assert guest_client.post(WATCHLIST_URL, watch_item_payload()).status_code == 201

    def test_guest_at_the_limit_gets_429_and_nothing_is_created(self, guest_client, guest):
        fill_watch_items(guest, WATCH_ITEM_LIMIT)
        response = guest_client.post(WATCHLIST_URL, watch_item_payload())
        assert response.status_code == 429
        assert WatchItem.objects.count() == WATCH_ITEM_LIMIT

    def test_my_account_has_no_watch_item_limit(self, api_client, user):
        fill_watch_items(user, WATCH_ITEM_LIMIT)
        assert api_client.post(WATCHLIST_URL, watch_item_payload()).status_code == 201


class TestConvertLimit:
    def test_convert_at_the_application_limit_gets_429_and_changes_nothing(self, guest_client, guest):
        fill_applications(guest, APPLICATION_LIMIT)
        item = create_watch_item(guest, note='')
        assert guest_client.post(convert_url(item.id)).status_code == 429
        assert WatchItem.objects.filter(id=item.id).exists()
        assert Application.objects.count() == APPLICATION_LIMIT

    def test_convert_with_a_note_at_the_note_limit_gets_429(self, guest_client, guest):
        fill_notes(fill_applications(guest, 1), NOTE_LIMIT)
        item = create_watch_item(guest, note='Would be one note too many')
        assert guest_client.post(convert_url(item.id)).status_code == 429
        assert (Application.objects.count(), Note.objects.count()) == (1, NOTE_LIMIT)

    def test_convert_without_a_note_at_the_note_limit_works(self, guest_client, guest):
        fill_notes(fill_applications(guest, 1), NOTE_LIMIT)
        item = create_watch_item(guest, note='')
        assert guest_client.post(convert_url(item.id)).status_code == 201
