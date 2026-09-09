import uuid
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.views import exception_handler
from django.contrib.auth import (
    authenticate,
    get_user_model,
    update_session_auth_hash,
    login as django_login,
    logout as django_logout
)
from django.utils import timezone

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
)
from devices.models import Device
from activity.models import LoginEvent

User = get_user_model()

def custom_exception_handler(exc, context):
    """
    Standardize exception responses without leaking stack traces or SQL internals.
    """
    import logging
    from django.core.exceptions import ValidationError as DjangoValidationError

    logger = logging.getLogger(__name__)

    # Handle Django core validation errors
    if isinstance(exc, DjangoValidationError):
        msg = exc.messages[0] if hasattr(exc, 'messages') and exc.messages else str(exc)
        return Response({
            'success': False,
            'error': msg,
            'details': {'validation': [msg]}
        }, status=status.HTTP_400_BAD_REQUEST)

    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict):
            # Format clean error message
            first_key = next(iter(response.data))
            first_val = response.data[first_key]
            if isinstance(first_val, list) and len(first_val) > 0:
                msg = str(first_val[0])
            else:
                msg = str(first_val)
            response.data = {
                'success': False,
                'error': msg,
                'details': response.data
            }
        else:
            response.data = {
                'success': False,
                'error': str(response.data)
            }
        return response

    # Fallback for unexpected internal errors
    logger.error(f"Unhandled API Exception: {exc}", exc_info=True)
    return Response({
        'success': False,
        'error': 'An internal server error occurred. Please try again.'
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RegisterView(views.APIView):
    """
    POST /api/auth/register/
    Registers a new account and registers the first device as trusted.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            first_err = 'Invalid registration data.'
            if serializer.errors:
                first_key = next(iter(serializer.errors))
                val = serializer.errors[first_key]
                if isinstance(val, list) and len(val) > 0:
                    first_err = str(val[0])
                else:
                    first_err = str(val)
            return Response({
                'success': False,
                'error': first_err,
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            user = User.objects.create_user(
                email=data['email'],
                name=data['name'],
                password=data['password']
            )
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e) or 'Failed to create user account.',
            }, status=status.HTTP_400_BAD_REQUEST)

        device_id = data.get('device_id') or f"dev_{uuid.uuid4().hex[:12]}"
        device, _ = Device.objects.get_or_create(
            user=user,
            device_id=device_id,
            defaults={
                'device_name': data.get('device_name', 'Primary Device'),
                'platform': data.get('platform', 'Unknown'),
                'browser': data.get('browser', 'Unknown'),
                'trusted': True,  # First device on registration is auto-trusted
            }
        )
        if not device.trusted:
            device.mark_trusted()

        token, _ = Token.objects.get_or_create(user=user)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        LoginEvent.log(
            event_type='LOGIN_SUCCESS',
            user=user,
            success=True,
            device=device,
            request=request
        )

        return Response({
            'success': True,
            'token': token.key,
            'user': UserSerializer(user).data,
            'device': {
                'device_id': device.device_id,
                'device_name': device.device_name,
                'trusted': device.trusted
            },
            'requires_device_verification': False
        }, status=status.HTTP_201_CREATED)


class LoginView(views.APIView):
    """
    POST /api/auth/login/
    Authenticates user and inspects device trust.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'Email and password are required.',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email'].lower().strip()
        password = serializer.validated_data['password']
        device_id = serializer.validated_data.get('device_id') or f"dev_{uuid.uuid4().hex[:12]}"
        device_name = serializer.validated_data.get('device_name', 'Web Client')
        platform = serializer.validated_data.get('platform', 'Unknown')
        browser = serializer.validated_data.get('browser', 'Unknown')

        user = authenticate(request, username=email, password=password)

        if user is None:
            # Check if user exists to record event, but give identical generic error message
            attempted_user = User.objects.filter(email=email).first()
            LoginEvent.log(
                event_type='LOGIN_FAILURE',
                user=attempted_user,
                email_attempted=email,
                success=False,
                request=request
            )
            return Response({
                'success': False,
                'error': 'Invalid email or password.'
            }, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({
                'success': False,
                'error': 'This account is inactive.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Inspect device
        device, created = Device.objects.get_or_create(
            user=user,
            device_id=device_id,
            defaults={
                'device_name': device_name,
                'platform': platform,
                'browser': browser,
                'trusted': False
            }
        )

        # Update last seen timestamp & properties
        device.device_name = device_name
        device.platform = platform
        device.browser = browser
        device.save(update_fields=['device_name', 'platform', 'browser', 'last_seen_at'])

        is_trusted = device.trusted and not device.revoked
        token, _ = Token.objects.get_or_create(user=user)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        # Establish Django session for Admin Portal integration
        django_login(request, user)

        is_admin = bool(user.is_staff or user.is_superuser)

        if not is_trusted and not is_admin:
            LoginEvent.log(
                event_type='NEW_DEVICE',
                user=user,
                success=True,
                device=device,
                request=request
            )
        else:
            LoginEvent.log(
                event_type='LOGIN_SUCCESS',
                user=user,
                success=True,
                device=device,
                request=request
            )

        return Response({
            'success': True,
            'token': token.key,
            'user': UserSerializer(user).data,
            'is_admin': is_admin,
            'redirect_url': '/admin/' if is_admin else None,
            'device': {
                'device_id': device.device_id,
                'device_name': device.device_name,
                'trusted': is_trusted,
                'revoked': device.revoked
            },
            'requires_device_verification': False if is_admin else (not is_trusted)
        }, status=status.HTTP_200_OK)


class LogoutView(views.APIView):
    """
    POST /api/auth/logout/
    Deletes the current auth token, invalidates Django session, and records a LOGOUT event.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        token = getattr(user, 'auth_token', None)
        if token:
            token.delete()

        LoginEvent.log(
            event_type='LOGOUT',
            user=user,
            success=True,
            request=request
        )

        django_logout(request)

        return Response({
            'success': True,
            'message': 'Logged out successfully.'
        }, status=status.HTTP_200_OK)


class MeView(views.APIView):
    """
    GET /api/auth/me/
    Retrieves current user identity metadata.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        trusted_count = user.devices.filter(trusted=True, revoked=False).count()
        return Response({
            'success': True,
            'user': UserSerializer(user).data,
            'trusted_devices_count': trusted_count
        })


class ChangePasswordView(views.APIView):
    """
    POST /api/auth/change-password/
    Updates Django account password hash.
    Note: Client-side vault DEK re-wrapping is performed in browser Web Crypto.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'Invalid password data.',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']

        if not request.user.check_password(old_password):
            return Response({
                'success': False,
                'error': 'Current password is incorrect.'
            }, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        update_session_auth_hash(request, request.user)

        # Refresh auth token
        Token.objects.filter(user=request.user).delete()
        new_token = Token.objects.create(user=request.user)

        LoginEvent.log(
            event_type='PASSWORD_CHANGED',
            user=request.user,
            success=True,
            request=request
        )

        return Response({
            'success': True,
            'message': 'Password updated successfully.',
            'token': new_token.key
        }, status=status.HTTP_200_OK)
