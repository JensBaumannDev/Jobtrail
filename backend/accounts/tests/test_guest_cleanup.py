import datetime
from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from tracker.models import Application, Note, WatchItem
from tracker.tests.helpers import create_application, create_note, create_watch_item

from .helpers import create_guest

pytestmark = pytest.mark.django_db

User = get_user_model()
GUEST_LIFETIME = datetime.timedelta(hours=3)


def run_cleanup():
    output = StringIO()
    call_command('delete_expired_guests', stdout=output)
    return output.getvalue().strip()


def guest_with_data(username, joined):
    guest = create_guest(username, date_joined=joined)
    create_note(create_application(guest))
    create_watch_item(guest)
    return guest


class TestDeleteExpiredGuests:
    def test_expired_guests_and_their_data_are_deleted(self, frozen_now):
        guest_with_data('guest-old', frozen_now - GUEST_LIFETIME - datetime.timedelta(minutes=5))
        guest_with_data('guest-older', frozen_now - datetime.timedelta(days=2))
        assert run_cleanup() == 'Deleted 2 expired guests.'
        assert not User.objects.filter(is_guest=True).exists()
        assert (Application.objects.count(), Note.objects.count(), WatchItem.objects.count()) == (0, 0, 0)

    def test_guest_of_exactly_three_hours_is_deleted(self, frozen_now):
        create_guest(date_joined=frozen_now - GUEST_LIFETIME)
        assert run_cleanup() == 'Deleted 1 expired guests.'

    def test_younger_guests_stay(self, frozen_now):
        fresh = guest_with_data('guest-fresh', frozen_now - GUEST_LIFETIME + datetime.timedelta(seconds=1))
        assert run_cleanup() == 'Deleted 0 expired guests.'
        assert Application.objects.filter(user=fresh).count() == 1

    def test_regular_users_are_never_deleted(self, frozen_now):
        old_user = User.objects.create_user('old-user', date_joined=frozen_now - datetime.timedelta(days=900))
        create_application(old_user)
        run_cleanup()
        assert User.objects.filter(id=old_user.id).exists()
        assert Application.objects.filter(user=old_user).count() == 1

    def test_only_expired_guests_go_in_a_mixed_set(self, frozen_now, user):
        guest_with_data('guest-old', frozen_now - datetime.timedelta(hours=4))
        fresh = guest_with_data('guest-fresh', frozen_now - datetime.timedelta(hours=1))
        run_cleanup()
        assert set(User.objects.values_list('username', flat=True)) == {user.username, fresh.username}

    def test_nothing_to_delete(self, frozen_now):
        assert run_cleanup() == 'Deleted 0 expired guests.'
