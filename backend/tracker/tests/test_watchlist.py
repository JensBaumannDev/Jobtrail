import pytest
from django.contrib import admin
from django.core.exceptions import ValidationError

from tracker.models import WatchItem

from .helpers import (
    WATCHLIST_URL,
    create_user,
    create_watch_item,
    stored_values,
    watch_item_payload,
    watch_item_url,
)

pytestmark = pytest.mark.django_db

WATCH_ITEM_FIELDS = {
    'id', 'company', 'website', 'careers_url', 'location', 'plan', 'note', 'created_at', 'updated_at',
}


def full_watch_item_payload():
    return watch_item_payload(
        careers_url='watched.example/jobs',
        location='Hamburg',
        plan='watch',
        note='Good engineering blog.',
    )


class TestWatchItemModel:
    def test_new_watch_item_gets_defaults(self):
        item = create_watch_item(create_user())
        assert item.plan == 'apply'
        assert item.careers_url == ''
        assert item.note == ''
        assert item.created_at is not None

    def test_plans_are_apply_and_watch(self):
        assert [key for key, _ in WatchItem.Plan.choices] == ['apply', 'watch']

    def test_company_and_website_are_required(self):
        item = WatchItem(user=create_user(), company='', website='')
        with pytest.raises(ValidationError) as error:
            item.full_clean()
        assert {'company', 'website'} <= error.value.message_dict.keys()

    def test_newest_watch_item_comes_first(self):
        user = create_user()
        older = create_watch_item(user, company='Older')
        newer = create_watch_item(user, company='Newer')
        assert list(WatchItem.objects.all()) == [newer, older]

    def test_string_is_the_company(self):
        assert str(create_watch_item(create_user(), company='Acme')) == 'Acme'

    def test_deleting_the_user_deletes_the_watch_items(self):
        user = create_user()
        create_watch_item(user)
        user.delete()
        assert WatchItem.objects.count() == 0

    def test_watch_item_is_registered_in_admin(self):
        assert admin.site.is_registered(WatchItem)


class TestListWatchItems:
    def test_list_returns_the_users_items_newest_first(self, api_client, user):
        older = create_watch_item(user, company='Older')
        newer = create_watch_item(user, company='Newer')
        response = api_client.get(WATCHLIST_URL)
        assert response.status_code == 200
        assert [item['id'] for item in response.json()] == [newer.id, older.id]

    def test_list_without_items_is_empty(self, api_client):
        assert api_client.get(WATCHLIST_URL).json() == []

    def test_list_item_has_every_documented_field(self, api_client, user):
        create_watch_item(user)
        assert set(api_client.get(WATCHLIST_URL).json()[0]) == WATCH_ITEM_FIELDS


class TestRetrieveWatchItem:
    def test_detail_returns_the_exact_body(self, api_client, user):
        item = create_watch_item(user, company='Acme', location='Kiel', plan='watch')
        body = api_client.get(watch_item_url(item.id)).json()
        assert body['id'] == item.id
        assert (body['company'], body['location'], body['plan']) == ('Acme', 'Kiel', 'watch')
        assert body['website'] == 'https://watched.example/'
        assert (body['careers_url'], body['note']) == ('', '')


class TestCreateWatchItem:
    def test_create_with_required_fields_only_fills_defaults(self, api_client, user):
        response = api_client.post(WATCHLIST_URL, watch_item_payload(), format='json')
        assert response.status_code == 201
        body = response.json()
        assert (body['website'], body['plan']) == ('https://watched.example/', 'apply')
        assert (body['careers_url'], body['location'], body['note']) == ('', '', '')
        assert WatchItem.objects.get(id=body['id']).user == user

    def test_create_with_every_field_stores_every_value(self, api_client):
        payload = full_watch_item_payload()
        body = api_client.post(WATCHLIST_URL, payload, format='json').json()
        expected = {
            **payload, 'website': 'https://watched.example/', 'careers_url': 'https://watched.example/jobs',
        }
        assert {field: body[field] for field in expected} == expected

    def test_create_adds_exactly_one_item(self, api_client):
        api_client.post(WATCHLIST_URL, watch_item_payload(), format='json')
        assert WatchItem.objects.count() == 1


class TestUpdateWatchItem:
    def test_patch_changes_only_the_sent_field(self, api_client, user):
        item = create_watch_item(user, location='Hamburg', note='Kept')
        response = api_client.patch(watch_item_url(item.id), {'location': 'Berlin'}, format='json')
        assert response.status_code == 200
        assert stored_values(item, ['location', 'note', 'company']) == {
            'location': 'Berlin', 'note': 'Kept', 'company': 'Watched AG',
        }

    def test_patch_updates_updated_at_but_not_created_at(self, api_client, user):
        item = create_watch_item(user)
        created_at, updated_at = item.created_at, item.updated_at
        api_client.patch(watch_item_url(item.id), {'plan': 'watch'}, format='json')
        item.refresh_from_db()
        assert item.created_at == created_at
        assert item.updated_at > updated_at

    def test_patch_with_empty_body_changes_nothing(self, api_client, user):
        item = create_watch_item(user, location='Hamburg')
        assert api_client.patch(watch_item_url(item.id), {}, format='json').status_code == 200
        assert stored_values(item, ['location', 'plan']) == {'location': 'Hamburg', 'plan': 'apply'}

    def test_put_is_not_allowed(self, api_client, user):
        item = create_watch_item(user)
        response = api_client.put(watch_item_url(item.id), full_watch_item_payload(), format='json')
        assert response.status_code == 405


class TestDeleteWatchItem:
    def test_delete_removes_only_that_item(self, api_client, user):
        kept = create_watch_item(user, company='Kept')
        response = api_client.delete(watch_item_url(create_watch_item(user).id))
        assert response.status_code == 204
        assert response.content == b''
        assert list(WatchItem.objects.all()) == [kept]

    def test_deleting_twice_returns_404(self, api_client, user):
        url = watch_item_url(create_watch_item(user).id)
        api_client.delete(url)
        assert api_client.delete(url).status_code == 404
