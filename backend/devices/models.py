import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Device(models.Model):
    """
    Device identity metadata.
    Zero cryptographic keys or sensitive vault payloads stored.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='devices'
    )
    device_id = models.CharField(max_length=128, db_index=True)
    device_name = models.CharField(max_length=255, default='Unknown Device')
    platform = models.CharField(max_length=100, blank=True, default='Unknown')
    browser = models.CharField(max_length=100, blank=True, default='Unknown')
    
    trusted = models.BooleanField(default=False)
    revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vital_devices'
        verbose_name = 'Device'
        verbose_name_plural = 'Devices'
        unique_together = ('user', 'device_id')
        ordering = ['-last_seen_at']

    def __str__(self):
        status = "Revoked" if self.revoked else ("Trusted" if self.trusted else "Untrusted")
        return f"{self.device_name} ({self.platform} / {self.browser}) — {status}"

    def revoke(self):
        self.revoked = True
        self.trusted = False
        self.revoked_at = timezone.now()
        self.save(update_fields=['revoked', 'trusted', 'revoked_at'])

    def mark_trusted(self):
        self.trusted = True
        self.revoked = False
        self.revoked_at = None
        self.save(update_fields=['trusted', 'revoked', 'revoked_at'])


class DeviceVerificationRequest(models.Model):
    """
    Cross-device authorization requests for unverified clients.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='verification_requests'
    )
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='verification_requests'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    requested_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'vital_device_verifications'
        verbose_name = 'Device Verification Request'
        verbose_name_plural = 'Device Verification Requests'
        ordering = ['-requested_at']

    def __str__(self):
        return f"Verification for {self.device.device_name} ({self.user.email}) [{self.status}]"
