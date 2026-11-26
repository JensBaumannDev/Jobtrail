from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from tracker.models import Application, Note, WatchItem
from tracker.services import convert_watch_item

from .serializers import ApplicationSerializer, NoteSerializer, WatchItemSerializer


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return Application.objects.filter(user=self.request.user).prefetch_related('notes')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], serializer_class=NoteSerializer)
    def notes(self, request, pk=None):
        application = self.get_object()
        serializer = NoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(application=application)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class NoteViewSet(mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = NoteSerializer
    http_method_names = ['patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return Note.objects.filter(application__user=self.request.user)


class WatchItemViewSet(viewsets.ModelViewSet):
    serializer_class = WatchItemSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return WatchItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        application = convert_watch_item(self.get_object())
        return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)
