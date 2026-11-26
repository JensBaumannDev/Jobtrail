from rest_framework import viewsets

from tracker.models import Application

from .serializers import ApplicationSerializer


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return Application.objects.filter(user=self.request.user).prefetch_related('notes')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
