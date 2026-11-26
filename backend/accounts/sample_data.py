import datetime

from tracker.models import Application, Note, WatchItem

SAMPLE_APPLICATIONS = [
    {
        'company': 'Northwind Labs', 'website': 'https://northwind-labs.example/', 'location': 'Hamburg',
        'work_mode': 'hybrid', 'status': 'intro_call_scheduled', 'applied': 12, 'responded': 5,
        'next_step': 'Intro call with the team lead', 'next_step_in': 2,
        'note': ('Prepare', 'Read their engineering blog and bring two questions.'),
    },
    {
        'company': 'Blue Harbor Software', 'website': 'https://blue-harbor.example/', 'location': 'Berlin',
        'work_mode': 'remote', 'status': 'awaiting_response', 'applied': 20,
    },
    {
        'company': 'Lumen Health', 'website': 'https://lumen-health.example/', 'location': 'Munich',
        'work_mode': 'on_site', 'status': 'further_interview', 'applied': 25, 'responded': 15,
        'next_step': 'Technical interview', 'next_step_in': 5,
        'note': ('First interview', 'Friendly team, small React and Django codebase.'),
    },
    {
        'company': 'Pine & Partners', 'website': 'https://pine-partners.example/', 'location': 'Remote',
        'work_mode': 'remote', 'status': 'offer', 'applied': 40, 'responded': 30,
        'salary_expectation': '58,000 EUR gross',
    },
    {
        'company': 'Copperfield Media', 'website': 'https://copperfield-media.example/', 'location': 'Cologne',
        'work_mode': 'hybrid', 'status': 'rejected_after_application', 'applied': 30, 'responded': 21,
    },
    {
        'company': 'Atlas Logistics', 'website': 'https://atlas-logistics.example/', 'location': 'Bremen',
        'work_mode': 'on_site', 'status': 'rejected_after_interview', 'applied': 45, 'responded': 35,
        'note': ('', 'They chose someone with more cloud experience.'),
    },
    {
        'company': 'Quartz Systems', 'website': 'https://quartz-systems.example/', 'location': 'Hanover',
        'work_mode': 'hybrid', 'status': 'not_applied',
    },
]

SAMPLE_WATCH_ITEMS = [
    {'company': 'Harbor Analytics', 'website': 'https://harbor-analytics.example/', 'plan': 'apply'},
    {
        'company': 'Greenfield Energy', 'website': 'https://greenfield-energy.example/', 'plan': 'watch',
        'careers_url': 'https://greenfield-energy.example/jobs', 'note': 'Hiring again in spring.',
    },
    {'company': 'Orbit Games', 'website': 'https://orbit-games.example/', 'plan': 'watch', 'location': 'Hamburg'},
]

DAY_FIELDS = {'applied': ('applied_on', -1), 'responded': ('responded_on', -1), 'next_step_in': ('next_step_on', 1)}


def create_sample_data(user, today):
    for sample in SAMPLE_APPLICATIONS:
        create_sample_application(user, today, dict(sample))
    WatchItem.objects.bulk_create(WatchItem(user=user, **sample) for sample in SAMPLE_WATCH_ITEMS)


def create_sample_application(user, today, sample):
    note = sample.pop('note', None)
    application = Application.objects.create(user=user, **with_dates(sample, today))
    if note:
        Note.objects.create(application=application, title=note[0], text=note[1])


def with_dates(sample, today):
    for key, (field, direction) in DAY_FIELDS.items():
        if key in sample:
            sample[field] = today + datetime.timedelta(days=direction * sample.pop(key))
    return sample
