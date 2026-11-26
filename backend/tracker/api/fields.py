import re
from urllib.parse import urlsplit, urlunsplit

from rest_framework import serializers

URL_SCHEME_PATTERN = re.compile(r'^[a-z][a-z0-9+.-]*:', re.IGNORECASE)
ALLOWED_URL_SCHEMES = {'http', 'https'}


class StrictCharField(serializers.CharField):
    default_error_messages = {'invalid': 'Must be text.'}

    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail('invalid')
        return super().to_internal_value(data)


class WebsiteField(StrictCharField):
    default_error_messages = {'invalid_url': 'Enter a valid http or https address.'}

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        normalized = normalize_website(value)
        if normalized is None:
            self.fail('invalid_url')
        return normalized


def normalize_website(value):
    candidate = value if URL_SCHEME_PATTERN.match(value) else f'https://{value}'
    try:
        parts = urlsplit(candidate)
        port = parts.port
    except ValueError:
        return None
    if not is_allowed_url(parts, candidate):
        return None
    host = parts.hostname + (f':{port}' if port else '')
    return urlunsplit((parts.scheme.lower(), host, parts.path or '/', parts.query, parts.fragment))


def is_allowed_url(parts, candidate):
    return (
        parts.scheme.lower() in ALLOWED_URL_SCHEMES
        and parts.hostname is not None
        and '.' in parts.hostname
        and parts.username is None
        and not any(character.isspace() for character in candidate)
    )
