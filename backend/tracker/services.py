from django.db import transaction

from .models import Application, Note


def convert_watch_item(watch_item):
    with transaction.atomic():
        application = create_application_from(watch_item)
        move_note(watch_item, application)
        watch_item.delete()
    return application


def create_application_from(watch_item):
    return Application.objects.create(
        user=watch_item.user,
        company=watch_item.company,
        website=watch_item.website,
        location=watch_item.location,
        job_ad_url=watch_item.careers_url,
        status=Application.Status.NOT_APPLIED,
    )


def move_note(watch_item, application):
    if watch_item.note:
        Note.objects.create(application=application, text=watch_item.note)
