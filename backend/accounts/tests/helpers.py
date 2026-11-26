from django.contrib.auth import get_user_model

TEST_PASSWORD = 'test-password-123'
NEW_PASSWORD = 'a-much-better-secret-42'

CSRF_URL = '/api/auth/csrf/'
LOGIN_URL = '/api/auth/login/'
LOGOUT_URL = '/api/auth/logout/'
ME_URL = '/api/auth/me/'
PASSWORD_CHANGE_URL = '/api/auth/password/change/'


def create_user(username='test-user', **fields):
    return get_user_model().objects.create_user(username=username, password=TEST_PASSWORD, **fields)


def fetch_csrf_token(client):
    response = client.get(CSRF_URL)
    return response.cookies['csrftoken'].value


def login(client, username='test-user', password=TEST_PASSWORD, **extra):
    token = fetch_csrf_token(client)
    payload = {'username': username, 'password': password}
    return client.post(LOGIN_URL, payload, format='json', HTTP_X_CSRFTOKEN=token, **extra)


def post_with_csrf(client, url, payload=None):
    token = fetch_csrf_token(client)
    return client.post(url, payload, format='json', HTTP_X_CSRFTOKEN=token)
