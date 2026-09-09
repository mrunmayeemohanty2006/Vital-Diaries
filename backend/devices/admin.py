from django.contrib import admin
from django.utils import timezone
from .models import Device, DeviceVerificationRequest

@admin.action(description="Mark selected devices as trusted")
def mark_devices_trusted(modeladmin, request, queryset):
    queryset.update(trusted=True, revoked=False, revoked_at=None)

@admin.action(description="Revoke selected devices")
def revoke_devices(modeladmin, request, queryset):
    queryset.update(trusted=False, revoked=True, revoked_at=timezone.now())

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    """
    Device management admin portal.
    Zero health records or cryptographic keys stored.
    """
    list_display = (
        'device_name',
        'user',
        'device_id',
        'platform',
        'browser',
        'trusted',
        'revoked',
        'last_seen_at',
    )
    list_filter = ('trusted', 'revoked', 'platform', 'browser')
    search_fields = ('device_name', 'device_id', 'user__email', 'user__name')
    ordering = ('-last_seen_at',)
    readonly_fields = ('id', 'created_at', 'last_seen_at', 'revoked_at')
    actions = [mark_devices_trusted, revoke_devices]

    fieldsets = (
        ('Device Identity', {'fields': ('id', 'user', 'device_id', 'device_name')}),
        ('Platform Metadata', {'fields': ('platform', 'browser')}),
        ('Trust Status', {'fields': ('trusted', 'revoked', 'revoked_at')}),
        ('Activity Timestamps', {'fields': ('created_at', 'last_seen_at')}),
    )


@admin.register(DeviceVerificationRequest)
class DeviceVerificationRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'device', 'status', 'requested_at', 'resolved_at')
    list_filter = ('status', 'requested_at')
    search_fields = ('user__email', 'device__device_name', 'device__device_id')
    readonly_fields = ('id', 'requested_at')
    ordering = ('-requested_at',)
