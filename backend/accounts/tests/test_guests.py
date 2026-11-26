import datetime

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from accounts import guests
from tracker.models import Application, Note, WatchItem
from tracker.tests.helpers import create_application, create_watch_item

from .helpers import (
    GUEST_LOGIN_URL,
    LOGOUT_URL,
    ME_URL,
    NEW_PASSWORD,
    PASSWORD_CHANGE_URL,
    create_guest,
    login,
    login_as_guest,
    post_with_csrf,
)

pytestmark = pytest.mark.django_db

User = get_user_model()
GUEST_LIFETIME = datetime.timedelta(hours=3)
GUEST_CAP = 30


@pytest.fixture
def guest_client(csrf_checking_client, frozen_now, frozen_today):
    login_as_guest(csrf_checking_client)
    return csrf_checking_client


def guest_aged(frozen_now, age):
    return create_guest(date_joined=frozen_now - age)


class TestGuestModel:
    def test_regular_user_is_not_a_guest(self, user):
        assert user.is_guest is False

    def test_guest_clock_uses_the_real_time(self):
        assert abs(guests.current_time() - timezone.now()) < datetime.timedelta(seconds=1)


class TestGuestLogin:
    def test_guest_login_returns_the_new_guest(self, csrf_checking_client, frozen_now):
        response = login_as_guest(csrf_checking_client)
        assert response.status_code == 201
        body = response.json()
        assert body['is_guest'] is True
        assert body['username'].startswith('guest-')
        assert datetime.datetime.fromisoformat(body['expires_at']) == frozen_now + GUEST_LIFETIME

    def test_guest_login_creates_a_guest_without_usable_password(self, guest_client):
        guest = User.objects.get(is_guest=True)
        assert not guest.has_usable_password()
        assert not guest.is_staff

    def test_every_guest_login_creates_a_new_guest(self, frozen_now):
        names = {login_as_guest(APIClient(enforce_csrf_checks=True)).json()['username'] for _ in range(3)}
        assert len(names) == 3
        assert User.objects.filter(is_guest=True).count() == 3

    def test_guest_login_starts_a_session(self, guest_client):
        assert guest_client.get(ME_URL).json()['is_guest'] is True

    def test_session_ends_together_with_the_guest(self, guest_client):
        assert guest_client.session.get_expiry_age() == GUEST_LIFETIME.total_seconds()

    def test_guest_login_without_csrf_token_returns_403(self, csrf_checking_client):
        assert csrf_checking_client.post(GUEST_LOGIN_URL).status_code == 403
        assert not User.objects.filter(is_guest=True).exists()

    def test_body_is_ignored(self, csrf_checking_client, frozen_now):
        response = post_with_csrf(csrf_checking_client, GUEST_LOGIN_URL, {'username': 'admin', 'is_staff': True})
        assert response.json()['username'].startswith('guest-')
        assert not User.objects.get(is_guest=True).is_staff

    def test_guest_login_while_logged_in_switches_to_the_guest(self, client_for, user, frozen_now):
        client = client_for(user)
        login_as_guest(client)
        assert client.get(ME_URL).json()['is_guest'] is True
        assert User.objects.filter(id=user.id).exists()

    @pytest.mark.parametrize('method', ['get', 'patch', 'delete'])
    def test_guest_login_only_allows_post(self, anonymous_client, method):
        assert getattr(anonymous_client, method)(GUEST_LOGIN_URL).status_code == 405


class TestSampleData:
    def test_guest_starts_with_sample_data(self, guest_client):
        guest = User.objects.get(is_guest=True)
        assert Application.objects.filter(user=guest).count() == 7
        assert Note.objects.filter(application__user=guest).count() == 3
        assert WatchItem.objects.filter(user=guest).count() == 3

    def test_sample_data_covers_every_status(self, guest_client):
        statuses = set(Application.objects.values_list('status', flat=True))
        assert statuses == set(Application.Status.values)

    def test_sample_data_has_a_follow_up_and_an_appointment(self, guest_client, frozen_today):
        follow_ups = Application.objects.filter(
            status='awaiting_response', responded_on=None, applied_on__lte=frozen_today - datetime.timedelta(days=14),
        )
        appointments = Application.objects.filter(
            next_step_on__range=(frozen_today, frozen_today + datetime.timedelta(days=7)),
        )
        assert follow_ups.exists()
        assert appointments.exists()

    def test_sample_dates_are_relative_to_today(self, guest_client, frozen_today):
        applied = Application.objects.exclude(applied_on=None).values_list('applied_on', flat=True)
        assert all(date < frozen_today for date in applied)
        assert all(date >= frozen_today for date in Application.objects.exclude(
            next_step_on=None).values_list('next_step_on', flat=True))

    def test_sample_data_is_returned_by_the_api(self, guest_client):
        assert len(guest_client.get('/api/applications/').json()) == 7
        assert len(guest_client.get('/api/watchlist/').json()) == 3

    def test_sample_data_belongs_only_to_the_guest(self, guest_client, user):
        assert not Application.objects.filter(user=user).exists()
        assert not WatchItem.objects.filter(user=user).exists()


class TestGuestIsolation:
    def test_guest_does_not_see_my_data(self, guest_client, user):
        mine = create_application(user)
        create_watch_item(user)
        ids = [item['id'] for item in guest_client.get('/api/applications/').json()]
        assert mine.id not in ids
        assert guest_client.get(f'/api/applications/{mine.id}/').status_code == 404

    def test_two_guests_do_not_see_each_other(self, frozen_now, frozen_today):
        first, second = APIClient(enforce_csrf_checks=True), APIClient(enforce_csrf_checks=True)
        login_as_guest(first)
        login_as_guest(second)
        first_ids = {item['id'] for item in first.get('/api/applications/').json()}
        second_ids = {item['id'] for item in second.get('/api/applications/').json()}
        assert first_ids.isdisjoint(second_ids)

    def test_i_do_not_see_guest_data(self, guest_client, api_client):
        assert api_client.get('/api/applications/').json() == []


class TestGuestExpiry:
    @pytest.mark.parametrize('age', [datetime.timedelta(0), GUEST_LIFETIME - datetime.timedelta(seconds=1)])
    def test_guest_younger_than_three_hours_is_let_in(self, client_for, frozen_now, age):
        client = client_for(guest_aged(frozen_now, age))
        assert client.get(ME_URL).status_code == 200

    @pytest.mark.parametrize('age', [GUEST_LIFETIME, GUEST_LIFETIME + datetime.timedelta(seconds=1)])
    @pytest.mark.parametrize('url', [ME_URL, '/api/applications/', '/api/watchlist/'])
    def test_guest_of_three_hours_or_older_gets_401(self, client_for, frozen_now, age, url):
        response = client_for(guest_aged(frozen_now, age)).get(url)
        assert response.status_code == 401
        assert response.has_header('WWW-Authenticate')

    def test_expired_guest_cannot_write(self, client_for, frozen_now):
        client = client_for(guest_aged(frozen_now, GUEST_LIFETIME))
        response = client.post('/api/applications/', {'company': 'x', 'website': 'x.example'}, format='json')
        assert response.status_code == 401
        assert Application.objects.count() == 0

    def test_my_old_account_never_expires(self, client_for, frozen_now):
        old_user = User.objects.create_user('old-user', date_joined=frozen_now - datetime.timedelta(days=900))
        assert client_for(old_user).get(ME_URL).status_code == 200

    def test_me_shows_when_the_guest_expires(self, client_for, frozen_now):
        guest = guest_aged(frozen_now, datetime.timedelta(hours=1))
        body = client_for(guest).get(ME_URL).json()
        assert datetime.datetime.fromisoformat(body['expires_at']) == frozen_now + datetime.timedelta(hours=2)


class TestGuestLogout:
    def test_logout_deletes_the_guest_and_all_data(self, guest_client):
        response = post_with_csrf(guest_client, LOGOUT_URL)
        assert response.status_code == 204
        assert not User.objects.filter(is_guest=True).exists()
        assert (Application.objects.count(), Note.objects.count(), WatchItem.objects.count()) == (0, 0, 0)

    def test_session_ends_after_guest_logout(self, guest_client):
        post_with_csrf(guest_client, LOGOUT_URL)
        assert guest_client.get(ME_URL).status_code == 401

    def test_guest_logout_keeps_my_data(self, guest_client, user):
        create_application(user)
        post_with_csrf(guest_client, LOGOUT_URL)
        assert User.objects.filter(id=user.id).exists()
        assert Application.objects.filter(user=user).count() == 1


class TestGuestRestrictions:
    def test_guest_cannot_change_a_password(self, guest_client):
        payload = {'old_password': '', 'new_password': NEW_PASSWORD}
        assert post_with_csrf(guest_client, PASSWORD_CHANGE_URL, payload).status_code == 403
        assert not User.objects.get(is_guest=True).has_usable_password()

    @pytest.mark.parametrize('password', ['', 'anything', '!'])
    def test_nobody_can_log_in_as_a_guest_with_a_password(self, frozen_now, password):
        guest = create_guest()
        response = login(APIClient(enforce_csrf_checks=True), username=guest.username, password=password)
        assert response.status_code == 400

    def test_guest_cannot_open_the_admin(self, client_for, frozen_now):
        response = client_for(create_guest()).get('/admin/')
        assert response.status_code == 302
        assert '/admin/login/' in response['Location']


class TestGuestLoginRateLimit:
    def test_sixth_guest_login_within_an_hour_returns_429(self, csrf_checking_client, frozen_now):
        for _ in range(5):
            assert login_as_guest(csrf_checking_client).status_code == 201
        response = login_as_guest(csrf_checking_client)
        assert response.status_code == 429
        assert User.objects.filter(is_guest=True).count() == 5

    def test_guest_limit_does_not_block_my_login(self, csrf_checking_client, user, frozen_now):
        for _ in range(6):
            login_as_guest(csrf_checking_client)
        assert login(csrf_checking_client).status_code == 200

    def test_other_ip_can_still_log_in_as_guest(self, csrf_checking_client, frozen_now):
        for _ in range(5):
            login_as_guest(csrf_checking_client)
        assert login_as_guest(csrf_checking_client, REMOTE_ADDR='192.0.2.60').status_code == 201


def fill_guests(amount, joined):
    User.objects.bulk_create(
        User(username=f'guest-filled-{number}', is_guest=True, date_joined=joined) for number in range(amount)
    )


class TestGuestCapacity:
    def test_guest_login_below_the_cap_works(self, csrf_checking_client, frozen_now, frozen_today):
        fill_guests(GUEST_CAP - 1, frozen_now)
        assert login_as_guest(csrf_checking_client).status_code == 201

    def test_guest_login_at_the_cap_returns_503_and_creates_nothing(self, csrf_checking_client, frozen_now):
        fill_guests(GUEST_CAP, frozen_now)
        response = login_as_guest(csrf_checking_client)
        assert response.status_code == 503
        assert response.json() == {'detail': 'The demo is busy right now. Please try again later.'}
        assert User.objects.filter(is_guest=True).count() == GUEST_CAP
        assert csrf_checking_client.get(ME_URL).status_code == 401

    def test_expired_guests_do_not_count(self, csrf_checking_client, frozen_now, frozen_today):
        fill_guests(GUEST_CAP, frozen_now - GUEST_LIFETIME)
        assert login_as_guest(csrf_checking_client).status_code == 201

    def test_regular_users_do_not_count(self, csrf_checking_client, frozen_now, frozen_today):
        User.objects.bulk_create(User(username=f'user-{number}') for number in range(GUEST_CAP))
        assert login_as_guest(csrf_checking_client).status_code == 201

    def test_cap_comes_from_the_settings(self, csrf_checking_client, frozen_now, frozen_today, settings):
        settings.GUEST_MAX_ACTIVE = 2
        fill_guests(2, frozen_now)
        assert login_as_guest(csrf_checking_client).status_code == 503

    def test_cap_does_not_block_my_login(self, csrf_checking_client, user, frozen_now):
        fill_guests(GUEST_CAP, frozen_now)
        assert login(csrf_checking_client).status_code == 200
