import pytest
from rest_framework.test import APIClient

from .helpers import ME_URL, NEW_PASSWORD, PASSWORD_CHANGE_URL, TEST_PASSWORD, login, post_with_csrf

pytestmark = pytest.mark.django_db


@pytest.fixture
def logged_in_client(csrf_checking_client, user):
    login(csrf_checking_client)
    return csrf_checking_client


def change_password(client, old_password=TEST_PASSWORD, new_password=NEW_PASSWORD):
    payload = {'old_password': old_password, 'new_password': new_password}
    return post_with_csrf(client, PASSWORD_CHANGE_URL, payload)


def password_is(user, password):
    user.refresh_from_db()
    return user.check_password(password)


class TestChangePassword:
    def test_change_returns_204_and_sets_the_new_password(self, logged_in_client, user):
        response = change_password(logged_in_client)
        assert response.status_code == 204
        assert password_is(user, NEW_PASSWORD)

    def test_old_password_stops_working(self, logged_in_client, user):
        change_password(logged_in_client)
        assert login(APIClient(enforce_csrf_checks=True)).status_code == 400

    def test_new_password_works_for_login(self, logged_in_client, user):
        change_password(logged_in_client)
        assert login(APIClient(enforce_csrf_checks=True), password=NEW_PASSWORD).status_code == 200

    def test_current_session_stays_logged_in(self, logged_in_client):
        change_password(logged_in_client)
        assert logged_in_client.get(ME_URL).status_code == 200

    def test_other_sessions_are_logged_out(self, logged_in_client, client_for, user):
        other_session = client_for(user)
        change_password(logged_in_client)
        assert other_session.get(ME_URL).status_code == 401


class TestRejectedPasswordChange:
    def test_wrong_old_password_is_rejected(self, logged_in_client, user):
        response = change_password(logged_in_client, old_password='wrong-password')
        assert response.status_code == 400
        assert 'old_password' in response.json()
        assert password_is(user, TEST_PASSWORD)

    @pytest.mark.parametrize('new_password', ['short1', '12345678901', 'password123', 'qwertyuiop'])
    def test_weak_new_password_is_rejected(self, logged_in_client, user, new_password):
        response = change_password(logged_in_client, new_password=new_password)
        assert response.status_code == 400
        assert 'new_password' in response.json()
        assert password_is(user, TEST_PASSWORD)

    def test_same_password_as_before_is_rejected(self, logged_in_client):
        response = change_password(logged_in_client, new_password=TEST_PASSWORD)
        assert 'new_password' in response.json()

    @pytest.mark.parametrize('field', ['old_password', 'new_password'])
    @pytest.mark.parametrize('value', [None, '', 42, ['x']])
    def test_invalid_field_is_rejected(self, logged_in_client, user, field, value):
        payload = {'old_password': TEST_PASSWORD, 'new_password': NEW_PASSWORD, field: value}
        response = post_with_csrf(logged_in_client, PASSWORD_CHANGE_URL, payload)
        assert field in response.json()
        assert password_is(user, TEST_PASSWORD)

    def test_new_password_over_128_characters_is_rejected(self, logged_in_client):
        assert 'new_password' in change_password(logged_in_client, new_password='Ab1-' * 33).json()

    def test_without_login_returns_401(self, anonymous_client, user):
        response = anonymous_client.post(PASSWORD_CHANGE_URL, {'old_password': TEST_PASSWORD}, format='json')
        assert response.status_code == 401
        assert password_is(user, TEST_PASSWORD)

    def test_without_csrf_token_returns_403(self, logged_in_client, user):
        payload = {'old_password': TEST_PASSWORD, 'new_password': NEW_PASSWORD}
        assert logged_in_client.post(PASSWORD_CHANGE_URL, payload, format='json').status_code == 403
        assert password_is(user, TEST_PASSWORD)

    @pytest.mark.parametrize('method', ['get', 'patch', 'delete'])
    def test_only_post_is_allowed(self, api_client, method):
        assert getattr(api_client, method)(PASSWORD_CHANGE_URL).status_code == 405
