from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta

from .models import LoginEvent
from .serializers import LoginEventSerializer
from devices.models import Device

User = get_user_model()

class ActivityListView(views.APIView):
    """
    GET /api/activity/
    Returns recent security events for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        events = LoginEvent.objects.filter(user=request.user).order_by('-timestamp')[:50]
        serializer = LoginEventSerializer(events, many=True)
        return Response({
            'success': True,
            'events': serializer.data
        })


class AdminStatsView(views.APIView):
    """
    GET /api/activity/admin-stats/
    Administrator statistics for the private dashboard.
    Strictly staff / superuser accessible.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        now = timezone.now()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        seven_days_ago = now - timedelta(days=7)

        total_users = User.objects.count()
        users_created_today = User.objects.filter(created_at__gte=start_of_day).count()
        active_users_7d = User.objects.filter(last_login__gte=seven_days_ago).count()

        logins_today_success = LoginEvent.objects.filter(
            timestamp__gte=start_of_day,
            event_type='LOGIN_SUCCESS',
            success=True
        ).count()

        logins_today_failed = LoginEvent.objects.filter(
            timestamp__gte=start_of_day,
            event_type='LOGIN_FAILURE'
        ).count()

        total_trusted_devices = Device.objects.filter(trusted=True, revoked=False).count()
        total_revoked_devices = Device.objects.filter(revoked=True).count()

        return Response({
            'success': True,
            'stats': {
                'total_users': total_users,
                'users_created_today': users_created_today,
                'active_users_7d': active_users_7d,
                'successful_logins_today': logins_today_success,
                'failed_logins_today': logins_today_failed,
                'trusted_devices': total_trusted_devices,
                'revoked_devices': total_revoked_devices,
            }
        })
