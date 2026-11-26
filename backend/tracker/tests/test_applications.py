import pytest
from django.contrib import admin
from django.core.exceptions import ValidationError

from tracker.models import Application, Note

from .helpers import (
    APPLICATIONS_URL,
    application_payload,
    application_url,
    create_application,
    create_note,
    create_user,
    full_application_payload,
    stored_values,
)

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

RESPONSE_FIELDS = {
    'id', 'company', 'website', 'role', 'location', 'work_mode', 'status', 'applied_on', 'responded_on',
    'next_step', 'next_step_on', 'job_ad_url', 'contact', 'salary_expectation', 'notes', 'created_at', 'updated_at',
}


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


class TestListApplications:
    def test_list_returns_the_users_applications_newest_first(self, api_client, user):
        older = create_application(user, company='Older')
        newer = create_application(user, company='Newer')
        response = api_client.get(APPLICATIONS_URL)
        assert response.status_code == 200
        assert [item['id'] for item in response.json()] == [newer.id, older.id]

    def test_list_without_applications_is_empty(self, api_client):
        response = api_client.get(APPLICATIONS_URL)
        assert response.status_code == 200
        assert response.json() == []

    def test_list_item_has_every_documented_field(self, api_client, user):
        create_application(user)
        assert set(api_client.get(APPLICATIONS_URL).json()[0]) == RESPONSE_FIELDS

    def test_list_contains_notes_newest_first(self, api_client, user):
        application = create_application(user)
        older = create_note(application, title='Older')
        newer = create_note(application, title='Newer')
        notes = api_client.get(APPLICATIONS_URL).json()[0]['notes']
        assert [note['id'] for note in notes] == [newer.id, older.id]
        assert set(notes[0]) == {'id', 'title', 'text', 'created_at', 'updated_at'}


class TestRetrieveApplication:
    def test_detail_returns_the_exact_body(self, api_client, user):
        application = create_application(user, company='Acme', location='Hamburg', next_step_on='2026-12-03')
        body = api_client.get(application_url(application.id)).json()
        assert body['id'] == application.id
        assert body['company'] == 'Acme'
        assert body['website'] == 'https://example.com/'
        assert body['location'] == 'Hamburg'
        assert body['next_step_on'] == '2026-12-03'
        assert body['applied_on'] is None
        assert body['notes'] == []

    def test_empty_optional_texts_are_returned_as_empty_strings(self, api_client, user):
        body = api_client.get(application_url(create_application(user).id)).json()
        for field in ['location', 'next_step', 'job_ad_url', 'contact', 'salary_expectation']:
            assert body[field] == ''


class TestCreateApplication:
    def test_create_with_required_fields_only_fills_defaults(self, api_client, user):
        response = api_client.post(APPLICATIONS_URL, application_payload())
        assert response.status_code == 201
        body = response.json()
        assert body['website'] == 'https://example.com/'
        assert (body['role'], body['work_mode'], body['status']) == ('Fullstack Developer', 'remote', 'not_applied')
        assert body['notes'] == []
        assert Application.objects.get(id=body['id']).user == user

    def test_create_with_every_field_stores_every_value(self, api_client):
        payload = full_application_payload()
        body = api_client.post(APPLICATIONS_URL, payload).json()
        expected = {**payload, 'website': 'https://example.com/', 'job_ad_url': 'https://example.com/jobs/42'}
        assert {field: body[field] for field in expected} == expected
        stored = Application.objects.get(id=body['id'])
        assert stored.next_step_on.isoformat() == '2026-12-03'

    def test_create_adds_exactly_one_application(self, api_client):
        api_client.post(APPLICATIONS_URL, application_payload())
        assert Application.objects.count() == 1


class TestUpdateApplication:
    def test_patch_changes_only_the_sent_field(self, api_client, user):
        application = create_application(user, location='Hamburg', contact='Jane')
        response = api_client.patch(application_url(application.id), {'location': 'Berlin'})
        assert response.status_code == 200
        assert stored_values(application, ['location', 'contact', 'company']) == {
            'location': 'Berlin', 'contact': 'Jane', 'company': 'Example GmbH',
        }

    def test_patch_updates_updated_at_but_not_created_at(self, api_client, user):
        application = create_application(user)
        created_at, updated_at = application.created_at, application.updated_at
        api_client.patch(application_url(application.id), {'location': 'Berlin'})
        application.refresh_from_db()
        assert application.created_at == created_at
        assert application.updated_at > updated_at

    def test_patch_with_empty_body_changes_nothing(self, api_client, user):
        application = create_application(user, location='Hamburg')
        response = api_client.patch(application_url(application.id), {})
        assert response.status_code == 200
        assert stored_values(application, ['location', 'status']) == {'location': 'Hamburg', 'status': 'not_applied'}

    def test_patch_of_status_only(self, api_client, user):
        application = create_application(user)
        response = api_client.patch(application_url(application.id), {'status': 'offer'})
        assert response.json()['status'] == 'offer'

    def test_put_is_not_allowed(self, api_client, user):
        application = create_application(user)
        response = api_client.put(application_url(application.id), full_application_payload())
        assert response.status_code == 405


class TestDeleteApplication:
    def test_delete_removes_application_and_notes(self, api_client, user):
        application = create_application(user)
        create_note(application)
        response = api_client.delete(application_url(application.id))
        assert response.status_code == 204
        assert response.content == b''
        assert (Application.objects.count(), Note.objects.count()) == (0, 0)

    def test_delete_keeps_the_other_applications(self, api_client, user):
        kept = create_application(user, company='Kept')
        api_client.delete(application_url(create_application(user).id))
        assert list(Application.objects.all()) == [kept]

    def test_deleting_twice_returns_404(self, api_client, user):
        url = application_url(create_application(user).id)
        api_client.delete(url)
        assert api_client.delete(url).status_code == 404


class TestAutomaticDates:
    def test_new_application_with_not_applied_has_no_dates(self, api_client, frozen_today):
        body = api_client.post(APPLICATIONS_URL, application_payload()).json()
        assert (body['applied_on'], body['responded_on']) == (None, None)

    def test_create_with_awaiting_response_sets_applied_on(self, api_client, frozen_today):
        body = api_client.post(APPLICATIONS_URL, application_payload(status='awaiting_response')).json()
        assert (body['applied_on'], body['responded_on']) == ('2026-11-27', None)

    @pytest.mark.parametrize('status', STATUSES[2:])
    def test_status_with_a_response_sets_both_dates(self, api_client, user, frozen_today, status):
        application = create_application(user)
        body = api_client.patch(application_url(application.id), {'status': status}).json()
        assert (body['applied_on'], body['responded_on']) == ('2026-11-27', '2026-11-27')

    def test_existing_dates_are_never_overwritten(self, api_client, user, frozen_today):
        application = create_application(user, applied_on='2026-11-01', responded_on='2026-11-10', status='offer')
        body = api_client.patch(application_url(application.id), {'status': 'further_interview'}).json()
        assert (body['applied_on'], body['responded_on']) == ('2026-11-01', '2026-11-10')

    def test_going_back_to_not_applied_keeps_the_dates(self, api_client, user, frozen_today):
        application = create_application(user, applied_on='2026-11-01', status='awaiting_response')
        body = api_client.patch(application_url(application.id), {'status': 'not_applied'}).json()
        assert body['applied_on'] == '2026-11-01'

    def test_dates_sent_by_the_client_are_ignored(self, api_client, frozen_today):
        payload = application_payload(applied_on='2020-01-01', responded_on='2020-01-02')
        body = api_client.post(APPLICATIONS_URL, payload).json()
        assert (body['applied_on'], body['responded_on']) == (None, None)

    def test_dates_are_also_set_when_saving_outside_the_api(self, user, frozen_today):
        application = create_application(user, status='rejected_after_application')
        assert (application.applied_on, application.responded_on) == (frozen_today, frozen_today)
