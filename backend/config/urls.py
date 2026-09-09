"""
Root URL configuration for Vital Diaries backend.
"""

from django.contrib import admin
from django.urls import path, include

# Configure Admin site branding
admin.site.site_header = "Vital Diaries Administration"
admin.site.site_title = "Vital Diaries Admin Portal"
admin.site.index_title = "Identity, Devices & Security Management"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/devices/', include('devices.urls')),
    path('api/activity/', include('activity.urls')),
]
