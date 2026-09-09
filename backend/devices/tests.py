from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from devices.models import Device, DeviceVerificationRequest
from activity.models import LoginEvent

User = get_user_model()

class DevicesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='mrunmayee@vitaldiaries.internal',
            name='Mrunmayee',
            password='SecurePassword2026#'
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

        self.device_primary = Device.objects.create(
            user=self.user,
            device_id='dev_primary_mac_001',
            device_name='MacBook Air M3',
            platform='macOS',
            browser='Safari',
            trusted=True
        )

        self.device_secondary = Device.objects.create(
            user=self.user,
            device_id='dev_secondary_ipad_002',
            device_name='iPad Pro 13',
            platform='iOS',
            browser='Safari',
            trusted=False
        )

        self.list_url = reverse('device-list')
        self.trust_url = reverse('device-trust')
        self.revoke_url = reverse('device-revoke')
        self.verify_req_url = reverse('device-verification-request')
        self.verify_approve_url = reverse('device-verification-approve')
        self.verify_recovery_url = reverse('device-verification-recovery')

    def test_list_devices(self):
        """User can list all registered devices."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['devices']), 2)

    def test_trust_device(self):
        """User can explicitly trust an untrusted device."""
        response = self.client.post(self.trust_url, {'device_id': self.device_secondary.device_id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.device_secondary.refresh_from_db()
        self.assertTrue(self.device_secondary.trusted)
        self.assertFalse(self.device_secondary.revoked)

    def test_revoke_device(self):
        """User can revoke an existing device."""
        response = self.client.post(self.revoke_url, {'device_id': self.device_primary.device_id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.device_primary.refresh_from_db()
        self.assertFalse(self.device_primary.trusted)
        self.assertTrue(self.device_primary.revoked)
        self.assertIsNotNone(self.device_primary.revoked_at)

    def test_device_verification_request_and_approval(self):
        """Untrusted device creates a verification request, trusted device approves it."""
        # 1. Request verification
        req_res = self.client.post(self.verify_req_url, {'device_id': self.device_secondary.device_id}, format='json')
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        request_id = req_res.data['request_id']

        # 2. Approve request
        app_res = self.client.post(self.verify_approve_url, {'request_id': request_id, 'approved': True}, format='json')
        self.assertEqual(app_res.status_code, status.HTTP_200_OK)
        
        self.device_secondary.refresh_from_db()
        self.assertTrue(self.device_secondary.trusted)

    def test_device_verification_recovery_acknowledgement(self):
        """Client performs local recovery unlock and server marks device trusted."""
        response = self.client.post(self.verify_recovery_url, {
            'device_id': self.device_secondary.device_id,
            'recovery_confirmed': True
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.device_secondary.refresh_from_db()
        self.assertTrue(self.device_secondary.trusted)

        # Verify RECOVERY_USED event logged
        event = LoginEvent.objects.filter(user=self.user, event_type='RECOVERY_USED').first()
        self.assertIsNotNone(event)

    def test_zero_medical_data_in_devices(self):
        """Device model contains zero health data or cipher keys."""
        device_fields = [f.name for f in Device._meta.get_fields()]
        forbidden = ['report', 'health', 'medical', 'ocr', 'lab', 'vitals', 'symptoms', 'dek', 'kek', 'recovery_key']
        for field in device_fields:
            for bad in forbidden:
                self.assertNotIn(bad, field.lower())
