from django.db import models
from rest_framework import serializers

from tracker.models import URL_LENGTH, Application, Note

from .fields import StrictCharField, WebsiteField


class StrictModelSerializer(serializers.ModelSerializer):
    serializer_field_mapping = {
        **serializers.ModelSerializer.serializer_field_mapping,
        models.CharField: StrictCharField,
        models.TextField: StrictCharField,
    }


class NoteSerializer(StrictModelSerializer):
    class Meta:
        model = Note
        fields = ['id', 'title', 'text', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attributes):
        title = attributes.get('title', getattr(self.instance, 'title', ''))
        text = attributes.get('text', getattr(self.instance, 'text', ''))
        if not title and not text:
            raise serializers.ValidationError('Enter a title or a text.')
        return attributes


class ApplicationSerializer(StrictModelSerializer):
    website = WebsiteField(max_length=URL_LENGTH)
    job_ad_url = WebsiteField(max_length=URL_LENGTH, required=False, allow_blank=True)
    notes = NoteSerializer(many=True, read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'company', 'website', 'role', 'location', 'work_mode', 'status', 'applied_on', 'responded_on',
            'next_step', 'next_step_on', 'job_ad_url', 'contact', 'salary_expectation', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['applied_on', 'responded_on', 'created_at', 'updated_at']
