import pytest

from tracker.models import Application

from .helpers import APPLICATIONS_URL, application_payload, application_url, create_application

pytestmark = pytest.mark.django_db

REQUIRED_FIELDS = ['company', 'website']
TEXT_LIMITS = {
    'company': 120,
    'role': 120,
    'location': 120,
    'next_step': 200,
    'contact': 120,
    'salary_expectation': 60,
}
OPTIONAL_TEXT_FIELDS = ['location', 'next_step', 'contact', 'salary_expectation', 'job_ad_url']
URL_FIELDS = ['website', 'job_ad_url']


def post(client, **fields):
    return client.post(APPLICATIONS_URL, application_payload(**fields), format='json')


def post_without(client, field):
    payload = application_payload()
    del payload[field]
    return client.post(APPLICATIONS_URL, payload, format='json')


def assert_rejected(response, field):
    assert response.status_code == 400
    assert field in response.json()
    assert Application.objects.count() == 0


class TestRequiredFields:
    @pytest.mark.parametrize('field', REQUIRED_FIELDS)
    def test_missing_required_field_is_rejected(self, api_client, field):
        assert_rejected(post_without(api_client, field), field)

    @pytest.mark.parametrize('field', REQUIRED_FIELDS)
    @pytest.mark.parametrize('value', ['', '   ', None])
    def test_empty_required_field_is_rejected(self, api_client, field, value):
        assert_rejected(post(api_client, **{field: value}), field)

    @pytest.mark.parametrize('field', REQUIRED_FIELDS)
    def test_patch_cannot_empty_a_required_field(self, api_client, user, field):
        application = create_application(user)
        response = api_client.patch(application_url(application.id), {field: ''})
        assert response.status_code == 400
        application.refresh_from_db()
        assert getattr(application, field) != ''

    def test_patch_without_required_fields_is_fine(self, api_client, user):
        application = create_application(user)
        assert api_client.patch(application_url(application.id), {'location': 'Kiel'}).status_code == 200


class TestTextFields:
    @pytest.mark.parametrize(('field', 'limit'), TEXT_LIMITS.items())
    def test_text_at_the_limit_is_accepted(self, api_client, field, limit):
        response = post(api_client, **{field: 'a' * limit})
        assert response.status_code == 201
        assert response.json()[field] == 'a' * limit

    @pytest.mark.parametrize(('field', 'limit'), TEXT_LIMITS.items())
    def test_text_over_the_limit_is_rejected(self, api_client, field, limit):
        assert_rejected(post(api_client, **{field: 'a' * (limit + 1)}), field)

    def test_spaces_around_text_are_stripped(self, api_client):
        assert post(api_client, company='  Acme  ').json()['company'] == 'Acme'

    @pytest.mark.parametrize('value', ['Müller & Söhne', 'Rocket 🚀 GmbH', '<script>alert(1)</script>'])
    def test_special_characters_are_stored_unchanged(self, api_client, value):
        body = post(api_client, company=value).json()
        assert body['company'] == value
        assert Application.objects.get(id=body['id']).company == value

    @pytest.mark.parametrize('field', OPTIONAL_TEXT_FIELDS)
    def test_optional_text_left_out_is_an_empty_string(self, api_client, field):
        body = post(api_client).json()
        assert body[field] == ''
        assert getattr(Application.objects.get(id=body['id']), field) == ''

    @pytest.mark.parametrize('field', OPTIONAL_TEXT_FIELDS)
    def test_optional_text_can_be_emptied(self, api_client, user, field):
        application = create_application(user, **{field: 'https://example.com/x'})
        response = api_client.patch(application_url(application.id), {field: ''})
        assert response.status_code == 200
        assert response.json()[field] == ''


class TestUrlFields:
    @pytest.mark.parametrize(('value', 'stored'), [
        ('example.com', 'https://example.com/'),
        ('  example.com  ', 'https://example.com/'),
        ('http://example.com', 'http://example.com/'),
        ('https://example.com/jobs/42?ref=x', 'https://example.com/jobs/42?ref=x'),
        ('EXAMPLE.COM', 'https://example.com/'),
        ('https://www.example.co.uk:8443/a', 'https://www.example.co.uk:8443/a'),
    ])
    @pytest.mark.parametrize('field', URL_FIELDS)
    def test_valid_url_is_normalized(self, api_client, field, value, stored):
        response = post(api_client, **{field: value})
        assert response.status_code == 201
        assert response.json()[field] == stored

    @pytest.mark.parametrize('value', [
        'ftp://example.com',
        'javascript:alert(1)',
        'mailto:a@b.de',
        'file:///etc/passwd',
        'example',
        'exa mple.com',
        'https://user:secret@example.com',
        'https://',
        'https://example.com:port',
        'https://[example.com',
    ])
    @pytest.mark.parametrize('field', URL_FIELDS)
    def test_invalid_url_is_rejected(self, api_client, field, value):
        assert_rejected(post(api_client, **{field: value}), field)

    @pytest.mark.parametrize('field', URL_FIELDS)
    def test_url_at_500_characters_is_accepted(self, api_client, field):
        value = 'https://example.com/' + 'a' * 480
        assert post(api_client, **{field: value}).json()[field] == value

    @pytest.mark.parametrize('field', URL_FIELDS)
    def test_url_over_500_characters_is_rejected(self, api_client, field):
        assert_rejected(post(api_client, **{field: 'https://example.com/' + 'a' * 481}), field)


class TestChoiceFields:
    @pytest.mark.parametrize('status', [choice for choice, _ in Application.Status.choices])
    def test_every_status_is_accepted(self, api_client, status):
        assert post(api_client, status=status).json()['status'] == status

    @pytest.mark.parametrize('work_mode', ['remote', 'hybrid', 'on_site'])
    def test_every_work_mode_is_accepted(self, api_client, work_mode):
        assert post(api_client, work_mode=work_mode).json()['work_mode'] == work_mode

    @pytest.mark.parametrize('field', ['status', 'work_mode'])
    @pytest.mark.parametrize('value', ['ghosted', 'Offer', 'Not applied', 'REMOTE', '', None, 3])
    def test_unknown_choice_is_rejected(self, api_client, field, value):
        assert_rejected(post(api_client, **{field: value}), field)


class TestDateField:
    def test_valid_date_is_stored(self, api_client):
        assert post(api_client, next_step_on='2027-01-15').json()['next_step_on'] == '2027-01-15'

    def test_date_in_the_past_is_accepted(self, api_client):
        assert post(api_client, next_step_on='2020-01-15').status_code == 201

    @pytest.mark.parametrize('value', ['2026-02-30', '27.11.2026', '2026/11/27', '2026-11-27T10:00:00', 'soon', 20261127])
    def test_invalid_date_is_rejected(self, api_client, value):
        assert_rejected(post(api_client, next_step_on=value), 'next_step_on')

    def test_date_can_be_null(self, api_client, user):
        application = create_application(user, next_step_on='2026-12-03')
        response = api_client.patch(application_url(application.id), {'next_step_on': None}, format='json')
        assert response.json()['next_step_on'] is None


class TestInputShape:
    def test_body_that_is_not_json_is_rejected(self, api_client):
        response = api_client.post(APPLICATIONS_URL, 'company=Acme', content_type='application/json')
        assert response.status_code == 400

    def test_list_instead_of_object_is_rejected(self, api_client):
        response = api_client.post(APPLICATIONS_URL, [application_payload()], format='json')
        assert response.status_code == 400
        assert Application.objects.count() == 0

    @pytest.mark.parametrize('value', [42, 4.2, True, ['Acme'], {'name': 'Acme'}])
    def test_wrong_type_for_text_is_rejected(self, api_client, value):
        assert_rejected(post(api_client, company=value), 'company')

    def test_unknown_fields_are_ignored(self, api_client):
        response = post(api_client, is_admin=True, favorite_color='blue')
        assert response.status_code == 201
        assert 'is_admin' not in response.json()

    def test_read_only_fields_are_ignored(self, api_client):
        payload = {'id': 9999, 'created_at': '2000-01-01T00:00:00Z', 'notes': [{'title': 'x'}]}
        body = post(api_client, **payload).json()
        assert body['id'] != 9999
        assert not body['created_at'].startswith('2000')
        assert body['notes'] == []

    def test_user_cannot_be_set_to_someone_else(self, api_client, user, other_user):
        body = post(api_client, user=other_user.id).json()
        assert Application.objects.get(id=body['id']).user == user
