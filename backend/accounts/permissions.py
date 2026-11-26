from rest_framework.permissions import BasePermission


class IsNotGuest(BasePermission):
    message = 'Guests cannot do this.'

    def has_permission(self, request, view):
        return not request.user.is_guest
