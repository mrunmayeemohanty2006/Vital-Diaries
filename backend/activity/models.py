import uuid
from django.db import models
from django.conf import settings

class LoginEvent(models.Model):
    """
    Security audit trail for authentication and device authorization events.
    Strictly records access metadata; zero sensitive health payload access.
    """
    EVENT_TYPES = (
        ('LOGIN_SUCCESS', 'Successful Login'),
        ('LOGIN_FAILURE', 'Failed Login Attempt'),
        ('LOGOUT', 'User Logout'),
        ('NEW_DEVICE', 'New Device Detected'),
        ('DEVICE_TRUSTED', 'Device Trusted'),
        ('DEVICE_REVOKED', 'Device Revoked'),
        ('RECOVERY_USED', 'Recovery Key Verification Used'),
        ('PASSWORD_CHANGED', 'Account Password Changed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_events'
    )
    email_attempted = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    success = models.BooleanField(default=True)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, db_index=True)
    
    device = models.ForeignKey(
        'devices.Device',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_events'
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        db_table = 'vital_login_events'
        verbose_name = 'Login & Security Event'
        verbose_name_plural = 'Login & Security Events'
        ordering = ['-timestamp']

    def __str__(self):
        user_str = self.user.email if self.user else (self.email_attempted or 'Unknown')
        status = "SUCCESS" if self.success else "FAILED"
        return f"[{self.timestamp:%Y-%m-%d %H:%M:%S}] {self.event_type} ({user_str}) — {status}"

    @classmethod
    def log(cls, event_type, user=None, email_attempted='', success=True, device=None, request=None):
        """
        Helper method to reliably log a security event extracting client IP and User-Agent.
        """
        ip = None
        ua = ''
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0].strip()
            else:
                ip = request.META.get('REMOTE_ADDR')
            ua = request.META.get('HTTP_USER_AGENT', '')

        if ip:
            import ipaddress
            try:
                ipaddress.ip_address(ip)
            except ValueError:
                ip = None

        user_obj = user if (user and getattr(user, 'is_authenticated', False)) else None
        return cls.objects.create(
            user=user_obj,
            email_attempted=email_attempted or (user_obj.email if user_obj else ''),
            event_type=event_type,
            success=success,
            device=device,
            ip_address=ip,
            user_agent=ua
        )
