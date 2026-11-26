from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .guests import is_expired_guest


class SessionAuthenticationWith401(SessionAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result and is_expired_guest(result[0]):
            raise AuthenticationFailed('The guest session has expired.')
        return result

    def authenticate_header(self, request):
        return 'Session'
