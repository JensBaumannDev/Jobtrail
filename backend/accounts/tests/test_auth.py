import pytest

from .helpers import (
    CSRF_URL,
    LOGIN_URL,
    LOGOUT_URL,
    ME_URL,
    TEST_PASSWORD,
    create_user,
    fetch_csrf_token,
    login,
    post_with_csrf,
)

pytestmark = pytest.mark.django_db

CURRENT_USER = {'username': 'test-user', 'is_guest': False, 'expires_at': None}


class TestCsrfCookie:
    def test_csrf_endpoint_sets_the_cookie(self, anonymous_client):
        response = anonymous_client.get(CSRF_URL)
        assert response.status_code == 204
        assert response.cookies['csrftoken'].value

    def test_csrf_cookie_is_readable_by_the_frontend(self, anonymous_client):
        cookie = anonymous_client.get(CSRF_URL).cookies['csrftoken']
        assert not cookie['httponly']
        assert cookie['samesite'] == 'Lax'

    def test_csrf_endpoint_works_when_logged_in(self, api_client):
        assert api_client.get(CSRF_URL).status_code == 204

    @pytest.mark.parametrize('method', ['post', 'patch', 'delete'])
    def test_csrf_endpoint_only_allows_get(self, anonymous_client, method):
        assert getattr(anonymous_client, method)(CSRF_URL).status_code == 405


class TestLogin:
    def test_login_returns_the_current_user(self, csrf_checking_client, user):
        response = login(csrf_checking_client)
        assert response.status_code == 200
        assert response.json() == CURRENT_USER

    def test_login_starts_a_session(self, csrf_checking_client, user):
        login(csrf_checking_client)
        assert csrf_checking_client.get(ME_URL).json() == CURRENT_USER

    def test_session_cookie_is_http_only_and_lax(self, csrf_checking_client, user):
        cookie = login(csrf_checking_client).cookies['sessionid']
        assert cookie['httponly']
        assert cookie['samesite'] == 'Lax'

    def test_login_gets_a_new_session_key(self, csrf_checking_client, user):
        session = csrf_checking_client.session
        session['before_login'] = True
        session.save()
        old_key = session.session_key
        login(csrf_checking_client)
        assert csrf_checking_client.cookies['sessionid'].value != old_key

    def test_login_as_another_user_switches_the_user(self, client_for, user):
        create_user('anna')
        client = client_for(user)
        login(client, username='anna')
        assert client.get(ME_URL).json()['username'] == 'anna'

    def test_password_is_not_trimmed(self, csrf_checking_client, user):
        response = login(csrf_checking_client, password=f' {TEST_PASSWORD} ')
        assert response.status_code == 400

    @pytest.mark.parametrize('method', ['get', 'patch', 'delete'])
    def test_login_only_allows_post(self, anonymous_client, method):
        assert getattr(anonymous_client, method)(LOGIN_URL).status_code == 405


class TestFailedLogin:
    @pytest.mark.parametrize(('username', 'password'), [
        ('test-user', 'wrong-password'),
        ('nobody', TEST_PASSWORD),
        ('TEST-USER', TEST_PASSWORD),
    ])
    def test_wrong_credentials_return_one_generic_error(self, csrf_checking_client, user, username, password):
        response = login(csrf_checking_client, username=username, password=password)
        assert response.status_code == 400
        assert response.json() == {'non_field_errors': ['Wrong username or password.']}

    def test_inactive_user_cannot_log_in(self, csrf_checking_client):
        create_user('test-user', is_active=False)
        response = login(csrf_checking_client)
        assert response.json() == {'non_field_errors': ['Wrong username or password.']}

    def test_failed_login_starts_no_session(self, csrf_checking_client, user):
        login(csrf_checking_client, password='wrong-password')
        assert csrf_checking_client.get(ME_URL).status_code == 401

    @pytest.mark.parametrize('field', ['username', 'password'])
    @pytest.mark.parametrize('value', [None, '', 42, True, ['test-user'], {'a': 1}])
    def test_invalid_field_is_rejected(self, csrf_checking_client, user, field, value):
        payload = {'username': 'test-user', 'password': TEST_PASSWORD, field: value}
        response = post_with_csrf(csrf_checking_client, LOGIN_URL, payload)
        assert response.status_code == 400
        assert field in response.json()

    @pytest.mark.parametrize(('field', 'limit'), [('username', 150), ('password', 128)])
    def test_too_long_field_is_rejected(self, csrf_checking_client, field, limit):
        payload = {'username': 'test-user', 'password': TEST_PASSWORD, field: 'a' * (limit + 1)}
        assert field in post_with_csrf(csrf_checking_client, LOGIN_URL, payload).json()

    def test_missing_body_is_rejected(self, csrf_checking_client):
        response = post_with_csrf(csrf_checking_client, LOGIN_URL)
        assert set(response.json()) == {'username', 'password'}

    def test_list_instead_of_object_is_rejected(self, csrf_checking_client):
        response = post_with_csrf(csrf_checking_client, LOGIN_URL, [{'username': 'test-user'}])
        assert response.status_code == 400

    def test_login_without_csrf_token_returns_403(self, csrf_checking_client, user):
        payload = {'username': 'test-user', 'password': TEST_PASSWORD}
        response = csrf_checking_client.post(LOGIN_URL, payload, format='json')
        assert response.status_code == 403
        assert csrf_checking_client.get(ME_URL).status_code == 401


class TestLoginRateLimit:
    def test_eleventh_attempt_within_an_hour_returns_429(self, csrf_checking_client, user):
        for _ in range(10):
            assert login(csrf_checking_client, password='wrong-password').status_code == 400
        response = login(csrf_checking_client)
        assert response.status_code == 429
        assert response.has_header('Retry-After')

    def test_successful_logins_count_too(self, csrf_checking_client, user):
        for _ in range(10):
            login(csrf_checking_client)
        assert login(csrf_checking_client).status_code == 429

    def test_blocked_login_starts_no_session(self, csrf_checking_client, user):
        for _ in range(10):
            login(csrf_checking_client, password='wrong-password')
        login(csrf_checking_client)
        assert csrf_checking_client.get(ME_URL).status_code == 401

    def test_spoofed_forwarded_for_header_does_not_reset_the_limit(self, csrf_checking_client, user):
        for attempt in range(10):
            login(csrf_checking_client, password='wrong-password', HTTP_X_FORWARDED_FOR=f'10.0.0.{attempt}')
        assert login(csrf_checking_client, HTTP_X_FORWARDED_FOR='10.0.0.99').status_code == 429

    def test_other_ip_is_not_blocked(self, csrf_checking_client, user):
        for _ in range(10):
            login(csrf_checking_client, password='wrong-password')
        assert login(csrf_checking_client, REMOTE_ADDR='192.0.2.50').status_code == 200


class TestLogout:
    def test_logout_ends_the_session(self, csrf_checking_client, user):
        login(csrf_checking_client)
        response = post_with_csrf(csrf_checking_client, LOGOUT_URL)
        assert response.status_code == 204
        assert csrf_checking_client.get(ME_URL).status_code == 401

    def test_logout_without_login_returns_401(self, anonymous_client):
        assert anonymous_client.post(LOGOUT_URL).status_code == 401

    def test_logout_without_csrf_token_returns_403_and_keeps_the_session(self, csrf_checking_client, user):
        login(csrf_checking_client)
        assert csrf_checking_client.post(LOGOUT_URL).status_code == 403
        assert csrf_checking_client.get(ME_URL).status_code == 200

    def test_logout_keeps_the_user_and_the_data(self, csrf_checking_client, user):
        login(csrf_checking_client)
        post_with_csrf(csrf_checking_client, LOGOUT_URL)
        user.refresh_from_db()
        assert user.is_active

    @pytest.mark.parametrize('method', ['get', 'patch', 'delete'])
    def test_logout_only_allows_post(self, api_client, method):
        assert getattr(api_client, method)(LOGOUT_URL).status_code == 405


class TestCurrentUser:
    def test_me_returns_the_current_user(self, api_client):
        response = api_client.get(ME_URL)
        assert response.status_code == 200
        assert response.json() == CURRENT_USER

    def test_me_without_login_returns_401(self, anonymous_client):
        response = anonymous_client.get(ME_URL)
        assert response.status_code == 401
        assert response.has_header('WWW-Authenticate')

    def test_me_never_contains_the_password_hash(self, api_client):
        assert 'password' not in api_client.get(ME_URL).json()

    def test_me_of_a_deactivated_user_returns_401(self, client_for, user):
        client = client_for(user)
        user.is_active = False
        user.save()
        assert client.get(ME_URL).status_code == 401

    @pytest.mark.parametrize('method', ['post', 'patch', 'delete'])
    def test_me_only_allows_get(self, api_client, method):
        assert getattr(api_client, method)(ME_URL).status_code == 405

    def test_csrf_token_from_the_endpoint_is_accepted(self, client_for, user):
        client = client_for(user, enforce_csrf_checks=True)
        token = fetch_csrf_token(client)
        assert client.post(LOGOUT_URL, HTTP_X_CSRFTOKEN=token).status_code == 204
