from rest_framework.routers import SimpleRouter

from .views import ApplicationViewSet, NoteViewSet

router = SimpleRouter()
router.register('applications', ApplicationViewSet, basename='application')
router.register('notes', NoteViewSet, basename='note')

urlpatterns = router.urls
