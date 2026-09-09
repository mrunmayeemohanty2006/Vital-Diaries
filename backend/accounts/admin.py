from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Administrator management for Vital Diaries accounts.
    Strictly displays identity metadata; ZERO medical records.
    """
    model = CustomUser
    list_display = ('email', 'name', 'is_active', 'is_staff', 'is_superuser', 'created_at', 'last_login')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'created_at')
    search_fields = ('email', 'name')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'last_login')

    fieldsets = (
        ('Account Identity', {'fields': ('id', 'email', 'name', 'password')}),
        ('Permissions & Status', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at', 'last_login')}),
    )

    add_fieldsets = (
        ('Create New User', {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password', 'is_active', 'is_staff'),
        }),
    )
