import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext

from tracker.models import Application, WatchItem

from .helpers import (
    WATCHLIST_URL,
    convert_url,
    create_watch_item,
    stored_values,
    watch_item_payload,
    watch_item_url,
)

pytestmark = pytest.mark.django_db


def every_request(item_id):
    return [
        ('get', WATCHLIST_URL, None),
        ('post', WATCHLIST_URL, watch_item_payload()),
        ('get', watch_item_url(item_id), None),
        ('patch', watch_item_url(item_id), {'location': 'Berlin'}),
        ('delete', watch_item_url(item_id), None),
        ('post', convert_url(item_id), None),
    ]


def send(client, method, url, payload):
    return getattr(client, method)(url, payload, format='json')


def count_list_queries(client):
    with CaptureQueriesContext(connection) as queries:
        client.get(WATCHLIST_URL)
    return len(queries)


def nothing_changed(item):
    return (
        WatchItem.objects.count() == 1
        and Application.objects.count() == 0
        and stored_values(item, ['location']) == {'location': 'Hamburg'}
    )


class TestNotLoggedIn:
    def test_every_request_returns_401_and_changes_nothing(self, anonymous_client, user):
        item = create_watch_item(user, location='Hamburg')
        for method, url, payload in every_request(item.id):
            response = send(anonymous_client, method, url, payload)
            assert response.status_code == 401, (method, url)
            assert response.has_header('WWW-Authenticate')
        assert nothing_changed(item)


class TestCsrf:
    def test_every_write_without_csrf_token_returns_403(self, client_for, user):
        item = create_watch_item(user, location='Hamburg')
        client = client_for(enforce_csrf_checks=True)
        for method, url, payload in every_request(item.id):
            expected = 200 if method == 'get' else 403
            assert send(client, method, url, payload).status_code == expected, (method, url)
        assert nothing_changed(item)


class TestOtherUsersItems:
    def test_list_never_shows_another_users_items(self, api_client, user, other_user):
        mine = create_watch_item(user)
        create_watch_item(other_user)
        assert [item['id'] for item in api_client.get(WATCHLIST_URL).json()] == [mine.id]

    def test_every_request_on_another_users_item_is_404_and_changes_nothing(self, api_client, other_user):
        foreign = create_watch_item(other_user, location='Hamburg')
        for method, url, payload in every_request(foreign.id)[2:]:
            assert send(api_client, method, url, payload).status_code == 404, (method, url)
        assert nothing_changed(foreign)


class TestMissingItems:
    @pytest.mark.parametrize('method', ['get', 'patch', 'delete'])
    def test_id_that_never_existed_is_404(self, api_client, method):
        assert send(api_client, method, watch_item_url(999999), {}).status_code == 404

    @pytest.mark.parametrize('url', [watch_item_url('abc'), convert_url('abc'), convert_url(999999)])
    def test_unknown_or_invalid_id_is_404(self, api_client, url):
        method = 'post' if url.endswith('convert/') else 'get'
        assert send(api_client, method, url, None).status_code == 404


class TestListQueries:
    def test_query_count_does_not_grow_with_items(self, api_client, user):
        create_watch_item(user)
        queries_for_one = count_list_queries(api_client)
        for _ in range(9):
            create_watch_item(user)
        assert count_list_queries(api_client) == queries_for_one
