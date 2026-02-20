from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScheduleViewSet, analytics_view

router = DefaultRouter()
router.register(r'schedules', ScheduleViewSet, basename='schedule')

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/', analytics_view, name='analytics'),
]
