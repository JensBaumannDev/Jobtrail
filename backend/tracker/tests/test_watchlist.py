import pytest
from django.contrib import admin
from django.core.exceptions import ValidationError

from tracker.models import WatchItem

from .helpers import create_user, create_watch_item

pytestmark = pytest.mark.django_db


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
