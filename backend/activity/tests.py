from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from activity.models import LoginEvent
from devices.models import Device

User = get_user_model()

class ActivityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='auditor@vitaldiaries.internal',
            name='Audit Officer',
            password='AuditorPassword2026#'
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.staff_user = User.objects.create_superuser(
            email='miti@vitaldiaries.internal',
            name='Miti Administrator',
            password='AdminPassword2026#'
        )
        self.staff_token = Token.objects.create(user=self.staff_user)

        self.activity_url = reverse('activity-list')
        self.admin_stats_url = reverse('activity-admin-stats')

    def test_user_can_view_own_activity(self):
        """User can view their own activity log."""
        LoginEvent.objects.create(
            user=self.user,
            event_type='LOGIN_SUCCESS',
            success=True
        )
        response = self.client.get(self.activity_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['events']), 1)

    def test_normal_user_cannot_access_admin_stats(self):
        """Normal user receives HTTP 403 Forbidden when accessing admin stats."""
        response = self.client.get(self.admin_stats_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_user_can_access_admin_stats(self):
        """Staff/superuser can retrieve dashboard statistics."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token.key}')
        response = self.client.get(self.admin_stats_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('total_users', response.data['stats'])
        self.assertIn('successful_logins_today', response.data['stats'])
        self.assertIn('trusted_devices', response.data['stats'])

    def test_zero_medical_data_in_activity(self):
        """LoginEvent model contains zero medical or cipher fields."""
        fields = [f.name for f in LoginEvent._meta.get_fields()]
        forbidden = ['report', 'health', 'medical', 'ocr', 'lab', 'vitals', 'symptoms', 'dek', 'kek', 'recovery_key']
        for field in fields:
            for bad in forbidden:
                self.assertNotIn(bad, field.lower())
