from rest_framework import serializers
from .models import LoginEvent

class LoginEventSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    device_name = serializers.SerializerMethodField()

    class Meta:
        model = LoginEvent
        fields = (
            'id',
            'user_email',
            'event_type',
            'success',
            'device_name',
            'timestamp',
            'ip_address',
            'user_agent',
        )
        read_only_fields = fields

    def get_user_email(self, obj):
        return obj.user.email if obj.user else obj.email_attempted

    def get_device_name(self, obj):
        return obj.device.device_name if obj.device else 'Unknown'
