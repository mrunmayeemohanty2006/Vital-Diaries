from rest_framework import serializers
from .models import Device, DeviceVerificationRequest

class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = (
            'id',
            'device_id',
            'device_name',
            'platform',
            'browser',
            'trusted',
            'revoked',
            'revoked_at',
            'created_at',
            'last_seen_at',
        )
        read_only_fields = ('id', 'created_at', 'last_seen_at')


class DeviceVerificationRequestSerializer(serializers.ModelSerializer):
    device = DeviceSerializer(read_only=True)

    class Meta:
        model = DeviceVerificationRequest
        fields = (
            'id',
            'device',
            'status',
            'requested_at',
            'resolved_at',
        )
        read_only_fields = ('id', 'requested_at', 'resolved_at')
