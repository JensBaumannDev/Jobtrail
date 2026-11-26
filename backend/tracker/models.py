from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

SHORT_TEXT_LENGTH = 120
URL_LENGTH = 500
LONG_TEXT_LENGTH = 5000


class Application(models.Model):
    class Status(models.TextChoices):
        NOT_APPLIED = 'not_applied', 'Not applied'
        AWAITING_RESPONSE = 'awaiting_response', 'Awaiting response'
        INTRO_CALL_SCHEDULED = 'intro_call_scheduled', 'Intro call scheduled'
        FURTHER_INTERVIEW = 'further_interview', 'Further interview'
        OFFER = 'offer', 'Offer'
        REJECTED_AFTER_APPLICATION = 'rejected_after_application', 'Rejected after application'
        REJECTED_AFTER_INTERVIEW = 'rejected_after_interview', 'Rejected after interview'

    class WorkMode(models.TextChoices):
        REMOTE = 'remote', 'Remote'
        HYBRID = 'hybrid', 'Hybrid'
        ON_SITE = 'on_site', 'On site'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applications')
    company = models.CharField(max_length=SHORT_TEXT_LENGTH)
    website = models.URLField(max_length=URL_LENGTH)
    role = models.CharField(max_length=SHORT_TEXT_LENGTH, blank=True, default='Fullstack Developer')
    location = models.CharField(max_length=SHORT_TEXT_LENGTH, blank=True)
    work_mode = models.CharField(max_length=20, choices=WorkMode.choices, default=WorkMode.REMOTE)
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.NOT_APPLIED)
    applied_on = models.DateField(null=True, blank=True)
    responded_on = models.DateField(null=True, blank=True)
    next_step = models.CharField(max_length=200, blank=True)
    next_step_on = models.DateField(null=True, blank=True)
    job_ad_url = models.URLField(max_length=URL_LENGTH, blank=True)
    contact = models.CharField(max_length=SHORT_TEXT_LENGTH, blank=True)
    salary_expectation = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return self.company

    def save(self, *args, **kwargs):
        self.record_status_dates()
        super().save(*args, **kwargs)

    def record_status_dates(self):
        today = timezone.localdate()
        if self.status != self.Status.NOT_APPLIED and self.applied_on is None:
            self.applied_on = today
        if self.status in STATUSES_WITH_RESPONSE and self.responded_on is None:
            self.responded_on = today


STATUSES_WITH_RESPONSE = {
    Application.Status.INTRO_CALL_SCHEDULED,
    Application.Status.FURTHER_INTERVIEW,
    Application.Status.OFFER,
    Application.Status.REJECTED_AFTER_APPLICATION,
    Application.Status.REJECTED_AFTER_INTERVIEW,
}


class Note(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='notes')
    title = models.CharField(max_length=SHORT_TEXT_LENGTH, blank=True)
    text = models.TextField(max_length=LONG_TEXT_LENGTH, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']
        constraints = [
            models.CheckConstraint(
                condition=~Q(title='') | ~Q(text=''),
                name='note_has_title_or_text',
            ),
        ]

    def __str__(self):
        return self.title or self.text


class WatchItem(models.Model):
    class Plan(models.TextChoices):
        APPLY = 'apply', 'Application planned'
        WATCH = 'watch', 'Keep watching'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='watch_items')
    company = models.CharField(max_length=SHORT_TEXT_LENGTH)
    website = models.URLField(max_length=URL_LENGTH)
    careers_url = models.URLField(max_length=URL_LENGTH, blank=True)
    location = models.CharField(max_length=SHORT_TEXT_LENGTH, blank=True)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.APPLY)
    note = models.TextField(max_length=LONG_TEXT_LENGTH, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return self.company
