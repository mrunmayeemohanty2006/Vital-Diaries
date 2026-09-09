from django.urls import path
from .views import ActivityListView, AdminStatsView

urlpatterns = [
    path('', ActivityListView.as_view(), name='activity-list'),
    path('admin-stats/', AdminStatsView.as_view(), name='activity-admin-stats'),
]
