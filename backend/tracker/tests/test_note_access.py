import pytest

from tracker.models import Note

from .helpers import APPLICATIONS_URL, create_application, create_note, note_url, notes_url

pytestmark = pytest.mark.django_db


def every_request(application, note):
    return [
        ('post', notes_url(application.id), {'title': 'New'}),
        ('patch', note_url(note.id), {'title': 'Changed'}),
        ('delete', note_url(note.id), None),
    ]


def send(client, method, url, payload):
    return getattr(client, method)(url, payload, format='json')


def note_is_unchanged(note, title):
    note.refresh_from_db()
    return note.title == title


class TestNotLoggedIn:
    def test_every_request_returns_401_and_changes_nothing(self, anonymous_client, user):
        application = create_application(user)
        note = create_note(application, title='Original')
        for method, url, payload in every_request(application, note):
            response = send(anonymous_client, method, url, payload)
            assert response.status_code == 401, (method, url)
            assert response.has_header('WWW-Authenticate')
        assert Note.objects.count() == 1
        assert note_is_unchanged(note, 'Original')


class TestCsrf:
    def test_every_write_without_csrf_token_returns_403(self, client_for, user):
        application = create_application(user)
        note = create_note(application, title='Original')
        client = client_for(enforce_csrf_checks=True)
        for method, url, payload in every_request(application, note):
            assert send(client, method, url, payload).status_code == 403, (method, url)
        assert Note.objects.count() == 1
        assert note_is_unchanged(note, 'Original')


class TestOtherUsersNotes:
    def test_adding_a_note_to_another_users_application_is_404(self, api_client, other_user):
        foreign = create_application(other_user)
        response = send(api_client, 'post', notes_url(foreign.id), {'title': 'Sneaky'})
        assert response.status_code == 404
        assert Note.objects.count() == 0

    def test_patch_of_another_users_note_is_404_and_changes_nothing(self, api_client, other_user):
        foreign_note = create_note(create_application(other_user), title='Original')
        assert send(api_client, 'patch', note_url(foreign_note.id), {'title': 'Hacked'}).status_code == 404
        assert note_is_unchanged(foreign_note, 'Original')

    def test_delete_of_another_users_note_is_404_and_keeps_it(self, api_client, other_user):
        foreign_note = create_note(create_application(other_user))
        assert api_client.delete(note_url(foreign_note.id)).status_code == 404
        assert Note.objects.filter(id=foreign_note.id).exists()

    def test_my_note_cannot_be_moved_to_another_users_application(self, api_client, user, other_user):
        note = create_note(create_application(user))
        foreign = create_application(other_user)
        send(api_client, 'patch', note_url(note.id), {'application': foreign.id})
        note.refresh_from_db()
        assert note.application.user == user

    def test_another_users_notes_never_show_up_in_my_applications(self, api_client, user, other_user):
        create_note(create_application(other_user), title='Secret')
        create_application(user)
        notes = [note for item in api_client.get(APPLICATIONS_URL).json() for note in item['notes']]
        assert notes == []


class TestMissingNotes:
    def test_note_id_that_never_existed_is_404(self, api_client):
        assert send(api_client, 'patch', note_url(999999), {'title': 'x'}).status_code == 404
        assert api_client.delete(note_url(999999)).status_code == 404

    def test_application_id_that_never_existed_is_404(self, api_client):
        assert send(api_client, 'post', notes_url(999999), {'title': 'x'}).status_code == 404
        assert Note.objects.count() == 0

    @pytest.mark.parametrize('url', [note_url('abc'), notes_url('abc')])
    def test_id_that_is_not_a_number_is_404(self, api_client, url):
        method = 'post' if url.endswith('notes/') else 'patch'
        assert send(api_client, method, url, {'title': 'x'}).status_code == 404
