from django.contrib import admin

from .models import Application, Note, WatchItem


class NoteInline(admin.TabularInline):
    model = Note
    extra = 0


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['company', 'role', 'status', 'applied_on', 'next_step_on', 'user']
    list_filter = ['status', 'work_mode']
    search_fields = ['company', 'role', 'location', 'contact']
    list_select_related = ['user']
    inlines = [NoteInline]


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'application', 'updated_at']
    search_fields = ['title', 'text']
    list_select_related = ['application']


@admin.register(WatchItem)
class WatchItemAdmin(admin.ModelAdmin):
    list_display = ['company', 'plan', 'location', 'user']
    list_filter = ['plan']
    search_fields = ['company', 'location']
    list_select_related = ['user']
