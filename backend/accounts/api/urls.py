from django.urls import path

from .views import CsrfView, CurrentUserView, LoginView, LogoutView, PasswordChangeView

urlpatterns = [
    path('csrf/', CsrfView.as_view(), name='csrf'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', CurrentUserView.as_view(), name='me'),
    path('password/change/', PasswordChangeView.as_view(), name='password-change'),
]
