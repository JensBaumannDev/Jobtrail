import datetime

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts import guests
from accounts.tests.helpers import create_user

FROZEN_TODAY = datetime.date(2026, 11, 27)
FROZEN_NOW = datetime.datetime(2026, 11, 27, 12, 0, tzinfo=datetime.UTC)


@pytest.fixture
def user(db):
    return create_user('test-user')


@pytest.fixture
def other_user(db):
    return create_user('other-user')


@pytest.fixture
def anonymous_client():
    return APIClient()


@pytest.fixture
def csrf_checking_client():
    return APIClient(enforce_csrf_checks=True)


@pytest.fixture
def client_for(user):
    def logged_in_client(account=user, enforce_csrf_checks=False):
        client = APIClient(enforce_csrf_checks=enforce_csrf_checks)
        client.force_login(account)
        return client

    return logged_in_client


@pytest.fixture
def api_client(client_for):
    return client_for()


@pytest.fixture
def frozen_today(monkeypatch):
    monkeypatch.setattr(timezone, 'localdate', lambda *args, **kwargs: FROZEN_TODAY)
    return FROZEN_TODAY


@pytest.fixture
def frozen_now(monkeypatch):
    monkeypatch.setattr(guests, 'current_time', lambda: FROZEN_NOW)
    return FROZEN_NOW
