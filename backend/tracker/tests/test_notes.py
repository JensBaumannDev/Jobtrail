import pytest
from django.contrib import admin
from django.db import IntegrityError

from tracker.models import Note

from .helpers import create_application, create_note, create_user

pytestmark = pytest.mark.django_db


@pytest.fixture
def application():
    return create_application(create_user())


class TestNoteModel:
    def test_note_with_title_only_is_saved(self, application):
        note = create_note(application, title='Reminder', text='')
        assert note.updated_at is not None

    def test_note_with_text_only_is_saved(self, application):
        assert create_note(application, title='', text='Call back on Monday').pk is not None

    def test_note_without_title_and_text_is_rejected(self, application):
        with pytest.raises(IntegrityError):
            create_note(application, title='', text='')

    def test_notes_are_reachable_from_the_application(self, application):
        note = create_note(application)
        assert list(application.notes.all()) == [note]

    def test_last_updated_note_comes_first(self, application):
        older = create_note(application, title='Older')
        newer = create_note(application, title='Newer')
        assert list(Note.objects.all()) == [newer, older]

    def test_string_is_the_title_or_the_text(self, application):
        assert str(create_note(application, title='Reminder')) == 'Reminder'
        assert str(create_note(application, title='', text='Just text')) == 'Just text'

    def test_note_is_registered_in_admin(self):
        assert admin.site.is_registered(Note)
