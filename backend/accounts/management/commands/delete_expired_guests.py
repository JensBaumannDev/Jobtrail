from django.core.management.base import BaseCommand

from accounts.guests import delete_expired_guests


class Command(BaseCommand):
    help = 'Deletes guest users older than three hours, together with their data.'

    def handle(self, *args, **options):
        count = delete_expired_guests()
        self.stdout.write(f'Deleted {count} expired guests.')
