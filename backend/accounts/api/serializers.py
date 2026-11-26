from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from tracker.api.fields import StrictCharField

USERNAME_LENGTH = 150
PASSWORD_LENGTH = 128


def password_field():
    return StrictCharField(max_length=PASSWORD_LENGTH, trim_whitespace=False)


class CurrentUserSerializer(serializers.Serializer):
    username = serializers.CharField()
    is_guest = serializers.SerializerMethodField()
    expires_at = serializers.SerializerMethodField()

    def get_is_guest(self, user):
        return False

    def get_expires_at(self, user):
        return None


class LoginSerializer(serializers.Serializer):
    username = StrictCharField(max_length=USERNAME_LENGTH)
    password = password_field()

    def validate(self, attributes):
        user = authenticate(self.context['request'], **attributes)
        if user is None:
            raise serializers.ValidationError('Wrong username or password.')
        return {'user': user}


class PasswordChangeSerializer(serializers.Serializer):
    old_password = password_field()
    new_password = password_field()

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('The current password is wrong.')
        return value

    def validate_new_password(self, value):
        user = self.context['request'].user
        if user.check_password(value):
            raise serializers.ValidationError('The new password must differ from the current one.')
        validate_password(value, user)
        return value
