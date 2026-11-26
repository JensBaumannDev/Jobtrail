import datetime
import uuid

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException

from tracker.models import Note

from .sample_data import create_sample_data

GUEST_LIFETIME = datetime.timedelta(hours=3)
GUEST_LIMITS = {'applications': 50, 'notes': 50, 'watch_items': 30}


class GuestLimitReached(APIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'The demo limit is reached. Delete something first.'
    default_code = 'guest_limit_reached'


def current_time():
    return timezone.now()


def create_guest_account():
    with transaction.atomic():
        guest = get_user_model().objects.create_user(
            username=f'guest-{uuid.uuid4().hex[:12]}',
            password=None,
            is_guest=True,
            date_joined=current_time(),
        )
        create_sample_data(guest, timezone.localdate())
    return guest


def guest_expires_at(user):
    return user.date_joined + GUEST_LIFETIME if user.is_guest else None


def seconds_left(user):
    return int((guest_expires_at(user) - current_time()).total_seconds())


def is_expired_guest(user):
    return user.is_guest and guest_expires_at(user) <= current_time()


def delete_expired_guests():
    expired = get_user_model().objects.filter(is_guest=True, date_joined__lte=current_time() - GUEST_LIFETIME)
    count = expired.count()
    expired.delete()
    return count


def ensure_guest_can_create(user, resource, amount=1):
    if not user.is_guest or amount == 0:
        return
    if count_owned(user, resource) + amount > GUEST_LIMITS[resource]:
        raise GuestLimitReached()


def count_owned(user, resource):
    if resource == 'notes':
        return Note.objects.filter(application__user=user).count()
    return getattr(user, resource).count()
