from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Safe public user serialization.
    NEVER exposes password hash, DEK, or recovery keys.
    """
    class Meta:
        model = User
        fields = ('id', 'name', 'email', 'is_staff', 'is_superuser', 'created_at', 'last_login')
        read_only_fields = ('id', 'is_staff', 'is_superuser', 'created_at', 'last_login')


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=8, required=True)
    device_id = serializers.CharField(max_length=128, required=False, default='')
    device_name = serializers.CharField(max_length=255, required=False, default='Primary Device')
    platform = serializers.CharField(max_length=100, required=False, default='Unknown')
    browser = serializers.CharField(max_length=100, required=False, default='Unknown')

    def validate_email(self, value):
        normalized = value.lower().strip()
        if User.objects.filter(email=normalized).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return normalized

    def validate_password(self, value):
        validate_password(value)
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    device_id = serializers.CharField(max_length=128, required=False, default='')
    device_name = serializers.CharField(max_length=255, required=False, default='Web Device')
    platform = serializers.CharField(max_length=100, required=False, default='Unknown')
    browser = serializers.CharField(max_length=100, required=False, default='Unknown')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, min_length=8, required=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value
