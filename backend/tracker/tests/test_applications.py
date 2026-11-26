import pytest
from django.contrib import admin
from django.core.exceptions import ValidationError

from tracker.models import Application, Note

from .helpers import create_application, create_note, create_user

pytestmark = pytest.mark.django_db

STATUSES = [
    'not_applied',
    'awaiting_response',
    'intro_call_scheduled',
    'further_interview',
    'offer',
    'rejected_after_application',
    'rejected_after_interview',
]


class TestApplicationModel:
    def test_new_application_gets_defaults(self):
        application = create_application(create_user())
        assert application.role == 'Fullstack Developer'
        assert application.status == 'not_applied'
        assert application.work_mode == 'remote'
        assert application.location == ''
        assert application.applied_on is None
        assert application.responded_on is None
        assert application.next_step_on is None
        assert application.created_at is not None

    def test_statuses_are_the_seven_known_keys(self):
        assert [key for key, _ in Application.Status.choices] == STATUSES

    def test_work_modes_are_remote_hybrid_and_on_site(self):
        assert [key for key, _ in Application.WorkMode.choices] == ['remote', 'hybrid', 'on_site']

    def test_unknown_status_is_rejected(self):
        application = create_application(create_user(), status='ghosted')
        with pytest.raises(ValidationError) as error:
            application.full_clean()
        assert 'status' in error.value.message_dict

    def test_company_and_website_are_required(self):
        application = Application(user=create_user(), company='', website='')
        with pytest.raises(ValidationError) as error:
            application.full_clean()
        assert {'company', 'website'} <= error.value.message_dict.keys()

    def test_newest_application_comes_first(self):
        user = create_user()
        older = create_application(user, company='Older')
        newer = create_application(user, company='Newer')
        assert list(Application.objects.all()) == [newer, older]

    def test_string_is_the_company(self):
        assert str(create_application(create_user(), company='Acme')) == 'Acme'

    def test_deleting_the_user_deletes_the_applications(self):
        user = create_user()
        create_application(user)
        user.delete()
        assert Application.objects.count() == 0

    def test_deleting_the_application_deletes_its_notes(self):
        application = create_application(create_user())
        create_note(application)
        application.delete()
        assert Note.objects.count() == 0

    def test_application_is_registered_in_admin(self):
        assert admin.site.is_registered(Application)
