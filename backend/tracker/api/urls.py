from rest_framework.routers import SimpleRouter

from .views import ApplicationViewSet, NoteViewSet, WatchItemViewSet

router = SimpleRouter()
router.register('applications', ApplicationViewSet, basename='application')
router.register('notes', NoteViewSet, basename='note')
router.register('watchlist', WatchItemViewSet, basename='watch-item')

urlpatterns = router.urls
