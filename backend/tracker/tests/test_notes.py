import pytest
from django.contrib import admin
from django.db import IntegrityError

from tracker.models import Note

from .helpers import create_application, create_note, create_user, note_url, notes_url

pytestmark = pytest.mark.django_db

NOTE_FIELDS = {'id', 'title', 'text', 'created_at', 'updated_at'}


@pytest.fixture
def application(user):
    return create_application(user)


def post_note(client, application, **fields):
    return client.post(notes_url(application.id), fields, format='json')


def patch_note(client, note, **fields):
    return client.patch(note_url(note.id), fields, format='json')


def assert_rejected(response, key):
    assert response.status_code == 400
    assert key in response.json()


class TestNoteModel:
    def test_note_with_title_only_is_saved(self, application):
        note = create_note(application, title='Reminder', text='')
        assert note.created_at is not None
        assert note.updated_at is not None

    def test_note_with_text_only_is_saved(self, application):
        assert create_note(application, title='', text='Call back on Monday').pk is not None

    def test_note_without_title_and_text_is_rejected(self, application):
        with pytest.raises(IntegrityError):
            create_note(application, title='', text='')

    def test_notes_are_reachable_from_the_application(self, application):
        note = create_note(application)
        assert list(application.notes.all()) == [note]

    def test_last_updated_note_comes_first(self, application):
        older = create_note(application, title='Older')
        newer = create_note(application, title='Newer')
        assert list(Note.objects.all()) == [newer, older]

    def test_string_is_the_title_or_the_text(self, application):
        assert str(create_note(application, title='Reminder')) == 'Reminder'
        assert str(create_note(application, title='', text='Just text')) == 'Just text'

    def test_note_is_registered_in_admin(self):
        assert admin.site.is_registered(Note)

    def test_deleting_the_user_deletes_the_notes(self, application, user):
        create_note(application)
        user.delete()
        assert Note.objects.count() == 0


class TestCreateNote:
    def test_create_returns_the_note(self, api_client, application):
        response = post_note(api_client, application, title='First call', text='Nice team.')
        assert response.status_code == 201
        body = response.json()
        assert set(body) == NOTE_FIELDS
        assert (body['title'], body['text']) == ('First call', 'Nice team.')
        assert Note.objects.get(id=body['id']).application == application

    def test_create_with_title_only(self, api_client, application):
        response = post_note(api_client, application, title='Reminder')
        assert response.status_code == 201
        assert response.json()['text'] == ''

    def test_create_with_text_only(self, api_client, application):
        response = post_note(api_client, application, text='Call back on Monday')
        assert response.status_code == 201
        assert response.json()['title'] == ''

    def test_create_adds_exactly_one_note(self, api_client, application):
        post_note(api_client, application, title='Reminder')
        assert Note.objects.count() == 1

    def test_new_note_shows_up_first_in_the_application(self, api_client, application):
        create_note(application, title='Older')
        new_id = post_note(api_client, application, title='Newer').json()['id']
        assert api_client.get(f'/api/applications/{application.id}/').json()['notes'][0]['id'] == new_id

    def test_application_field_in_the_body_is_ignored(self, api_client, application, user):
        other_application = create_application(user, company='Other')
        payload = {'title': 'Here', 'application': other_application.id}
        body = api_client.post(notes_url(application.id), payload, format='json').json()
        assert Note.objects.get(id=body['id']).application == application

    @pytest.mark.parametrize('method', ['get', 'put', 'patch', 'delete'])
    def test_notes_route_only_allows_post(self, api_client, application, method):
        response = getattr(api_client, method)(notes_url(application.id), {}, format='json')
        assert response.status_code == 405


class TestTitleOrText:
    @pytest.mark.parametrize('payload', [{}, {'title': '', 'text': ''}, {'title': '   ', 'text': '\n\t '}])
    def test_note_without_title_and_text_is_rejected(self, api_client, application, payload):
        assert_rejected(post_note(api_client, application, **payload), 'non_field_errors')
        assert Note.objects.count() == 0

    def test_patch_cannot_empty_both(self, api_client, application):
        note = create_note(application, title='Reminder', text='')
        assert_rejected(patch_note(api_client, note, title=''), 'non_field_errors')
        note.refresh_from_db()
        assert note.title == 'Reminder'

    def test_patch_can_empty_the_title_when_text_remains(self, api_client, application):
        note = create_note(application, title='Reminder', text='Still here')
        assert patch_note(api_client, note, title='').json()['title'] == ''

    def test_patch_can_swap_title_for_text(self, api_client, application):
        note = create_note(application, title='Reminder', text='')
        body = patch_note(api_client, note, title='', text='Now text').json()
        assert (body['title'], body['text']) == ('', 'Now text')


class TestNoteFields:
    @pytest.mark.parametrize(('field', 'limit'), [('title', 120), ('text', 5000)])
    def test_value_at_the_limit_is_accepted(self, api_client, application, field, limit):
        response = post_note(api_client, application, **{field: 'a' * limit})
        assert response.status_code == 201
        assert response.json()[field] == 'a' * limit

    @pytest.mark.parametrize(('field', 'limit'), [('title', 120), ('text', 5000)])
    def test_value_over_the_limit_is_rejected(self, api_client, application, field, limit):
        assert_rejected(post_note(api_client, application, **{field: 'a' * (limit + 1)}), field)

    def test_spaces_around_title_and_text_are_stripped(self, api_client, application):
        body = post_note(api_client, application, title='  Call  ', text='\n Text \n').json()
        assert (body['title'], body['text']) == ('Call', 'Text')

    def test_line_breaks_inside_the_text_are_kept(self, api_client, application):
        text = 'First line\n\nSecond line'
        assert post_note(api_client, application, text=text).json()['text'] == text

    @pytest.mark.parametrize('value', ['Müller & Söhne', 'Super 🚀', '<b>bold</b>'])
    def test_special_characters_are_stored_unchanged(self, api_client, application, value):
        assert post_note(api_client, application, title=value).json()['title'] == value

    @pytest.mark.parametrize('field', ['title', 'text'])
    @pytest.mark.parametrize('value', [None, 42, True, ['a'], {'a': 1}])
    def test_wrong_type_is_rejected(self, api_client, application, field, value):
        assert_rejected(post_note(api_client, application, **{field: value}), field)

    def test_list_instead_of_object_is_rejected(self, api_client, application):
        response = api_client.post(notes_url(application.id), [{'title': 'x'}], format='json')
        assert response.status_code == 400
        assert Note.objects.count() == 0

    def test_unknown_and_read_only_fields_are_ignored(self, api_client, application):
        payload = {'title': 'x', 'id': 9999, 'created_at': '2000-01-01T00:00:00Z', 'is_admin': True}
        body = post_note(api_client, application, **payload).json()
        assert body['id'] != 9999
        assert not body['created_at'].startswith('2000')
        assert 'is_admin' not in body


class TestUpdateNote:
    def test_patch_changes_only_the_sent_field(self, api_client, application):
        note = create_note(application, title='Old', text='Kept')
        response = patch_note(api_client, note, title='New')
        assert response.status_code == 200
        note.refresh_from_db()
        assert (note.title, note.text) == ('New', 'Kept')

    def test_patch_updates_updated_at_but_not_created_at(self, api_client, application):
        note = create_note(application)
        created_at, updated_at = note.created_at, note.updated_at
        patch_note(api_client, note, title='New')
        note.refresh_from_db()
        assert note.created_at == created_at
        assert note.updated_at > updated_at

    def test_patch_with_empty_body_changes_nothing(self, api_client, application):
        note = create_note(application, title='Same', text='Same text')
        assert patch_note(api_client, note).status_code == 200
        note.refresh_from_db()
        assert (note.title, note.text) == ('Same', 'Same text')

    def test_patch_cannot_move_the_note_to_another_application(self, api_client, application, user):
        note = create_note(application)
        other_application = create_application(user, company='Other')
        api_client.patch(note_url(note.id), {'application': other_application.id}, format='json')
        note.refresh_from_db()
        assert note.application == application

    @pytest.mark.parametrize('method', ['get', 'put'])
    def test_get_and_put_are_not_allowed(self, api_client, application, method):
        note = create_note(application)
        response = getattr(api_client, method)(note_url(note.id), {'title': 'x'}, format='json')
        assert response.status_code == 405


class TestDeleteNote:
    def test_delete_removes_only_the_note(self, api_client, application):
        note = create_note(application)
        kept = create_note(application, title='Kept')
        response = api_client.delete(note_url(note.id))
        assert response.status_code == 204
        assert response.content == b''
        assert list(Note.objects.all()) == [kept]
        assert application.__class__.objects.filter(id=application.id).exists()

    def test_deleting_twice_returns_404(self, api_client, application):
        url = note_url(create_note(application).id)
        api_client.delete(url)
        assert api_client.delete(url).status_code == 404
