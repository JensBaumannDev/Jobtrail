import pytest

from tracker.models import WatchItem

from .helpers import WATCHLIST_URL, create_watch_item, watch_item_payload, watch_item_url

pytestmark = pytest.mark.django_db

REQUIRED_FIELDS = ['company', 'website']
TEXT_LIMITS = {'company': 120, 'location': 120, 'note': 5000}
OPTIONAL_FIELDS = ['careers_url', 'location', 'note']
URL_FIELDS = ['website', 'careers_url']


def post(client, **fields):
    return client.post(WATCHLIST_URL, watch_item_payload(**fields), format='json')


def assert_rejected(response, field):
    assert response.status_code == 400
    assert field in response.json()
    assert WatchItem.objects.count() == 0


class TestRequiredFields:
    @pytest.mark.parametrize('field', REQUIRED_FIELDS)
    def test_missing_required_field_is_rejected(self, api_client, field):
        payload = watch_item_payload()
        del payload[field]
        assert_rejected(api_client.post(WATCHLIST_URL, payload, format='json'), field)

    @pytest.mark.parametrize('field', REQUIRED_FIELDS)
    @pytest.mark.parametrize('value', ['', '   ', None])
    def test_empty_required_field_is_rejected(self, api_client, field, value):
        assert_rejected(post(api_client, **{field: value}), field)

    @pytest.mark.parametrize('field', REQUIRED_FIELDS)
    def test_patch_cannot_empty_a_required_field(self, api_client, user, field):
        item = create_watch_item(user)
        response = api_client.patch(watch_item_url(item.id), {field: ''}, format='json')
        assert response.status_code == 400
        item.refresh_from_db()
        assert getattr(item, field) != ''


class TestTextFields:
    @pytest.mark.parametrize(('field', 'limit'), TEXT_LIMITS.items())
    def test_text_at_the_limit_is_accepted(self, api_client, field, limit):
        assert post(api_client, **{field: 'a' * limit}).json()[field] == 'a' * limit

    @pytest.mark.parametrize(('field', 'limit'), TEXT_LIMITS.items())
    def test_text_over_the_limit_is_rejected(self, api_client, field, limit):
        assert_rejected(post(api_client, **{field: 'a' * (limit + 1)}), field)

    def test_spaces_around_text_are_stripped_and_line_breaks_inside_kept(self, api_client):
        body = post(api_client, company='  Acme  ', note='\n First\nSecond \n').json()
        assert (body['company'], body['note']) == ('Acme', 'First\nSecond')

    @pytest.mark.parametrize('value', ['Müller & Söhne', 'Rocket 🚀 GmbH', '<script>alert(1)</script>'])
    def test_special_characters_are_stored_unchanged(self, api_client, value):
        assert post(api_client, company=value).json()['company'] == value

    @pytest.mark.parametrize('field', OPTIONAL_FIELDS)
    def test_optional_field_can_be_emptied(self, api_client, user, field):
        item = create_watch_item(user, **{field: 'https://watched.example/x'})
        response = api_client.patch(watch_item_url(item.id), {field: ''}, format='json')
        assert response.json()[field] == ''

    @pytest.mark.parametrize('field', ['company', 'location', 'note'])
    @pytest.mark.parametrize('value', [42, True, ['a'], {'a': 1}])
    def test_wrong_type_is_rejected(self, api_client, field, value):
        assert_rejected(post(api_client, **{field: value}), field)


class TestUrlFields:
    @pytest.mark.parametrize(('value', 'stored'), [
        ('watched.example', 'https://watched.example/'),
        ('http://watched.example', 'http://watched.example/'),
        ('WATCHED.EXAMPLE/Jobs?team=web', 'https://watched.example/Jobs?team=web'),
    ])
    @pytest.mark.parametrize('field', URL_FIELDS)
    def test_valid_url_is_normalized(self, api_client, field, value, stored):
        assert post(api_client, **{field: value}).json()[field] == stored

    @pytest.mark.parametrize('value', [
        'ftp://watched.example', 'javascript:alert(1)', 'mailto:a@b.de', 'watched', 'wat ched.example',
        'https://user:secret@watched.example',
    ])
    @pytest.mark.parametrize('field', URL_FIELDS)
    def test_invalid_url_is_rejected(self, api_client, field, value):
        assert_rejected(post(api_client, **{field: value}), field)

    @pytest.mark.parametrize('field', URL_FIELDS)
    def test_url_length_limit_is_500(self, api_client, field):
        at_limit = 'https://watched.example/' + 'a' * 476
        assert post(api_client, **{field: at_limit}).json()[field] == at_limit
        WatchItem.objects.all().delete()
        assert_rejected(post(api_client, **{field: at_limit + 'a'}), field)


class TestPlanField:
    @pytest.mark.parametrize('plan', ['apply', 'watch'])
    def test_every_plan_is_accepted(self, api_client, plan):
        assert post(api_client, plan=plan).json()['plan'] == plan

    @pytest.mark.parametrize('value', ['later', 'Apply', 'Application planned', '', None, 1])
    def test_unknown_plan_is_rejected(self, api_client, value):
        assert_rejected(post(api_client, plan=value), 'plan')


class TestInputShape:
    def test_list_instead_of_object_is_rejected(self, api_client):
        response = api_client.post(WATCHLIST_URL, [watch_item_payload()], format='json')
        assert response.status_code == 400
        assert WatchItem.objects.count() == 0

    def test_body_that_is_not_json_is_rejected(self, api_client):
        response = api_client.post(WATCHLIST_URL, 'company=Acme', content_type='application/json')
        assert response.status_code == 400

    def test_unknown_and_read_only_fields_are_ignored(self, api_client):
        body = post(api_client, id=9999, created_at='2000-01-01T00:00:00Z', is_admin=True).json()
        assert body['id'] != 9999
        assert not body['created_at'].startswith('2000')
        assert 'is_admin' not in body

    def test_user_cannot_be_set_to_someone_else(self, api_client, user, other_user):
        body = post(api_client, user=other_user.id).json()
        assert WatchItem.objects.get(id=body['id']).user == user
