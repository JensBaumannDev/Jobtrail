import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from tracker.models import Application

from .helpers import (
    APPLICATIONS_URL,
    application_payload,
    application_url,
    create_application,
    create_note,
    stored_values,
)

pytestmark = pytest.mark.django_db


def every_request(application_id):
    detail = application_url(application_id)
    return [
        ('get', APPLICATIONS_URL, None),
        ('post', APPLICATIONS_URL, application_payload()),
        ('get', detail, None),
        ('patch', detail, {'location': 'Berlin'}),
        ('delete', detail, None),
    ]


def send(client, method, url, payload):
    return getattr(client, method)(url, payload, format='json')


def count_list_queries(client):
    with CaptureQueriesContext(connection) as queries:
        client.get(APPLICATIONS_URL)
    return len(queries)


class TestNotLoggedIn:
    def test_every_request_returns_401_with_authenticate_header(self, anonymous_client, user):
        for method, url, payload in every_request(create_application(user).id):
            response = send(anonymous_client, method, url, payload)
            assert response.status_code == 401, (method, url)
            assert response.has_header('WWW-Authenticate')

    def test_nothing_changes_without_login(self, anonymous_client, user):
        application = create_application(user, location='Hamburg')
        for method, url, payload in every_request(application.id):
            send(anonymous_client, method, url, payload)
        assert Application.objects.count() == 1
        assert stored_values(application, ['location']) == {'location': 'Hamburg'}

    def test_session_of_a_deleted_user_returns_401(self, client_for, other_user):
        client = client_for(other_user)
        other_user.delete()
        assert client.get(APPLICATIONS_URL).status_code == 401


class TestCsrf:
    @pytest.mark.parametrize('method', ['post', 'patch', 'delete'])
    def test_write_without_csrf_token_returns_403(self, client_for, user, method):
        application = create_application(user, location='Hamburg')
        url = APPLICATIONS_URL if method == 'post' else application_url(application.id)
        response = send(client_for(enforce_csrf_checks=True), method, url, application_payload())
        assert response.status_code == 403
        assert Application.objects.count() == 1
        assert stored_values(application, ['location']) == {'location': 'Hamburg'}

    def test_read_without_csrf_token_works(self, client_for):
        assert client_for(enforce_csrf_checks=True).get(APPLICATIONS_URL).status_code == 200


class TestOtherUsersApplications:
    def test_list_never_shows_another_users_applications(self, api_client, user, other_user):
        mine = create_application(user)
        create_note(create_application(other_user), title='Secret')
        body = api_client.get(APPLICATIONS_URL).json()
        assert [item['id'] for item in body] == [mine.id]

    def test_detail_of_another_users_application_is_404(self, api_client, other_user):
        foreign = create_application(other_user)
        assert api_client.get(application_url(foreign.id)).status_code == 404

    def test_patch_of_another_users_application_is_404_and_changes_nothing(self, api_client, other_user):
        foreign = create_application(other_user, location='Hamburg')
        response = api_client.patch(application_url(foreign.id), {'location': 'Berlin'})
        assert response.status_code == 404
        assert stored_values(foreign, ['location']) == {'location': 'Hamburg'}

    def test_delete_of_another_users_application_is_404_and_keeps_it(self, api_client, other_user):
        foreign = create_application(other_user)
        assert api_client.delete(application_url(foreign.id)).status_code == 404
        assert Application.objects.filter(id=foreign.id).exists()

    def test_other_user_does_not_see_my_new_application(self, api_client, client_for, other_user):
        api_client.post(APPLICATIONS_URL, application_payload())
        assert client_for(other_user).get(APPLICATIONS_URL).json() == []


class TestMissingApplications:
    def test_id_that_never_existed_is_404(self, api_client):
        assert api_client.get(application_url(999999)).status_code == 404

    @pytest.mark.parametrize('method', ['get', 'patch', 'delete'])
    def test_id_that_is_not_a_number_is_404(self, api_client, method):
        assert send(api_client, method, application_url('abc'), {}).status_code == 404


class TestListQueries:
    def test_query_count_does_not_grow_with_applications_and_notes(self, api_client, user):
        create_note(create_application(user))
        queries_for_one = count_list_queries(api_client)
        for _ in range(9):
            create_note(create_note(create_application(user)).application)
        assert count_list_queries(api_client) == queries_for_one
