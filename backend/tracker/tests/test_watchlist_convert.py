import pytest

from tracker.models import Application, Note, WatchItem

from .helpers import APPLICATIONS_URL, convert_url, create_watch_item

pytestmark = pytest.mark.django_db


@pytest.fixture
def watch_item(user):
    return create_watch_item(
        user,
        company='Acme',
        website='https://acme.example/',
        careers_url='https://acme.example/jobs',
        location='Hamburg',
        plan='watch',
        note='Ask about the frontend team.',
    )


def convert(client, item, payload=None):
    return client.post(convert_url(item.id), payload, format='json')


class TestConvertWatchItem:
    def test_convert_returns_the_new_application(self, api_client, watch_item):
        response = convert(api_client, watch_item)
        assert response.status_code == 201
        body = response.json()
        assert (body['company'], body['website'], body['location']) == (
            'Acme', 'https://acme.example/', 'Hamburg',
        )
        assert body['job_ad_url'] == 'https://acme.example/jobs'

    def test_new_application_starts_with_defaults(self, api_client, watch_item):
        body = convert(api_client, watch_item).json()
        assert (body['status'], body['role'], body['work_mode']) == ('not_applied', 'Fullstack Developer', 'remote')
        assert (body['applied_on'], body['responded_on']) == (None, None)

    def test_new_application_belongs_to_the_user(self, api_client, watch_item, user):
        body = convert(api_client, watch_item).json()
        assert Application.objects.get(id=body['id']).user == user

    def test_note_moves_over_as_the_first_note(self, api_client, watch_item):
        body = convert(api_client, watch_item).json()
        assert [(note['title'], note['text']) for note in body['notes']] == [('', 'Ask about the frontend team.')]
        assert Note.objects.get().application_id == body['id']

    def test_empty_note_creates_no_note(self, api_client, user):
        item = create_watch_item(user, note='')
        assert convert(api_client, item).json()['notes'] == []
        assert Note.objects.count() == 0

    def test_empty_careers_page_leaves_job_ad_url_empty(self, api_client, user):
        item = create_watch_item(user, careers_url='')
        assert convert(api_client, item).json()['job_ad_url'] == ''

    def test_watch_item_is_deleted(self, api_client, watch_item):
        convert(api_client, watch_item)
        assert not WatchItem.objects.filter(id=watch_item.id).exists()

    def test_other_watch_items_stay(self, api_client, watch_item, user):
        kept = create_watch_item(user, company='Kept')
        convert(api_client, watch_item)
        assert list(WatchItem.objects.all()) == [kept]

    def test_converted_application_shows_up_in_the_list(self, api_client, watch_item):
        new_id = convert(api_client, watch_item).json()['id']
        assert [item['id'] for item in api_client.get(APPLICATIONS_URL).json()] == [new_id]

    def test_body_is_ignored(self, api_client, watch_item):
        body = convert(api_client, watch_item, {'status': 'offer', 'company': 'Other'}).json()
        assert (body['status'], body['company']) == ('not_applied', 'Acme')

    def test_converting_twice_returns_404_and_creates_one_application(self, api_client, watch_item):
        convert(api_client, watch_item)
        assert convert(api_client, watch_item).status_code == 404
        assert Application.objects.count() == 1

    @pytest.mark.parametrize('method', ['get', 'patch', 'delete'])
    def test_convert_only_allows_post(self, api_client, watch_item, method):
        response = getattr(api_client, method)(convert_url(watch_item.id), {}, format='json')
        assert response.status_code == 405


class TestConvertTransaction:
    def test_failure_in_the_last_step_changes_nothing(self, api_client, watch_item, monkeypatch):
        def fail_to_delete(*args, **kwargs):
            raise RuntimeError('database went away')

        monkeypatch.setattr(WatchItem, 'delete', fail_to_delete)
        with pytest.raises(RuntimeError):
            convert(api_client, watch_item)
        assert WatchItem.objects.filter(id=watch_item.id).exists()
        assert (Application.objects.count(), Note.objects.count()) == (0, 0)

    def test_failure_while_moving_the_note_changes_nothing(self, api_client, watch_item, monkeypatch):
        def fail_to_create(*args, **kwargs):
            raise RuntimeError('database went away')

        monkeypatch.setattr(Note.objects, 'create', fail_to_create)
        with pytest.raises(RuntimeError):
            convert(api_client, watch_item)
        assert WatchItem.objects.count() == 1
        assert Application.objects.count() == 0
