from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class JobtrailUserAdmin(UserAdmin):
    list_display = ['username', 'is_guest', 'is_staff', 'date_joined', 'last_login']
    list_filter = ['is_guest', 'is_staff', 'is_active']
