from django.contrib.auth import login, logout, update_session_auth_hash
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import SessionAuthenticationWith401
from accounts.guests import create_guest_account, seconds_left
from accounts.permissions import IsNotGuest
from accounts.throttling import IpRateThrottle

from .serializers import CurrentUserSerializer, LoginSerializer, PasswordChangeSerializer

MODEL_BACKEND = 'django.contrib.auth.backends.ModelBackend'


def check_csrf(request):
    SessionAuthenticationWith401().enforce_csrf(request)


@method_decorator(ensure_csrf_cookie, name='get')
class CsrfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [IpRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        check_csrf(request)
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return Response(CurrentUserSerializer(user).data)


class GuestLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [IpRateThrottle]
    throttle_scope = 'guest_login'

    def post(self, request):
        check_csrf(request)
        guest = create_guest_account()
        login(request, guest, backend=MODEL_BACKEND)
        request.session.set_expiry(seconds_left(guest))
        return Response(CurrentUserSerializer(guest).data, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    def post(self, request):
        user = request.user
        logout(request)
        if user.is_guest:
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated, IsNotGuest]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        update_session_auth_hash(request, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
