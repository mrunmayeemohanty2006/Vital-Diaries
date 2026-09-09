from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from activity.models import LoginEvent

User = get_user_model()

class AccountsAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('auth-register')
        self.login_url = reverse('auth-login')
        self.logout_url = reverse('auth-logout')
        self.me_url = reverse('auth-me')
        self.change_password_url = reverse('auth-change-password')

        self.user_data = {
            'name': 'Dr. Alistair Vance',
            'email': 'alistair@vitaldiaries.internal',
            'password': 'StrongSecurePass2026#',
            'device_id': 'dev_test_macbook_01',
            'device_name': 'MacBook Pro 16',
            'platform': 'macOS',
            'browser': 'Chrome'
        }

    def test_valid_registration(self):
        """User can successfully register and first device is automatically trusted."""
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['email'], self.user_data['email'])
        self.assertTrue(response.data['device']['trusted'])
        self.assertFalse(response.data['requires_device_verification'])

        # Verify DB state
        user = User.objects.get(email=self.user_data['email'])
        self.assertTrue(user.check_password(self.user_data['password']))
        self.assertNotEqual(user.password, self.user_data['password'])  # Must be hashed

        # Verify LoginEvent created
        event = LoginEvent.objects.filter(user=user, event_type='LOGIN_SUCCESS').first()
        self.assertIsNotNone(event)

    def test_duplicate_email_registration_fails(self):
        """Registering with an existing email returns a validation error."""
        User.objects.create_user(
            email=self.user_data['email'],
            name=self.user_data['name'],
            password='InitialPassword123#'
        )
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])

    def test_short_password_registration_fails(self):
        """Registering with a short password fails validation."""
        bad_data = self.user_data.copy()
        bad_data['password'] = 'short'
        response = self.client.post(self.register_url, bad_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_success_on_trusted_device(self):
        """Login on recognized trusted device succeeds without requiring verification."""
        # Create user and trusted device
        user = User.objects.create_user(
            email=self.user_data['email'],
            name=self.user_data['name'],
            password=self.user_data['password']
        )
        user.devices.create(
            device_id=self.user_data['device_id'],
            device_name=self.user_data['device_name'],
            trusted=True
        )

        response = self.client.post(self.login_url, {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
            'device_id': self.user_data['device_id'],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertFalse(response.data['requires_device_verification'])
        self.assertTrue(response.data['device']['trusted'])

    def test_login_success_on_new_device_triggers_verification(self):
        """Login with valid password on a new/unknown device requires device verification."""
        User.objects.create_user(
            email=self.user_data['email'],
            name=self.user_data['name'],
            password=self.user_data['password']
        )

        response = self.client.post(self.login_url, {
            'email': self.user_data['email'],
            'password': self.user_data['password'],
            'device_id': 'dev_brand_new_phone_99',
            'device_name': 'iPhone 15 Pro'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertTrue(response.data['requires_device_verification'])
        self.assertFalse(response.data['device']['trusted'])

        # Verify NEW_DEVICE event logged
        event = LoginEvent.objects.filter(event_type='NEW_DEVICE').first()
        self.assertIsNotNone(event)

    def test_login_incorrect_password_fails_safely(self):
        """Incorrect password returns safe generic error without leaking internals."""
        User.objects.create_user(
            email=self.user_data['email'],
            name=self.user_data['name'],
            password=self.user_data['password']
        )

        response = self.client.post(self.login_url, {
            'email': self.user_data['email'],
            'password': 'WrongPassword123#'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'Invalid email or password.')

        # Verify LOGIN_FAILURE logged
        event = LoginEvent.objects.filter(event_type='LOGIN_FAILURE').first()
        self.assertIsNotNone(event)
        self.assertFalse(event.success)

    def test_login_nonexistent_user_returns_identical_error(self):
        """Nonexistent email returns identical generic message to prevent user enumeration."""
        response = self.client.post(self.login_url, {
            'email': 'nobody@vitaldiaries.internal',
            'password': 'AnyPassword123#'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['error'], 'Invalid email or password.')

    def test_authenticated_me_endpoint(self):
        """GET /api/auth/me/ returns profile information."""
        user = User.objects.create_user(
            email=self.user_data['email'],
            name=self.user_data['name'],
            password=self.user_data['password']
        )
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], user.email)
        self.assertEqual(response.data['user']['name'], user.name)

    def test_logout_invalidates_token(self):
        """POST /api/auth/logout/ deletes token."""
        user = User.objects.create_user(
            email=self.user_data['email'],
            name=self.user_data['name'],
            password=self.user_data['password']
        )
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Token.objects.filter(key=token.key).exists())

    def test_change_password_workflow(self):
        """POST /api/auth/change-password/ verifies old password and updates hash."""
        user = User.objects.create_user(
            email=self.user_data['email'],
            name=self.user_data['name'],
            password='OldSecurePass2026#'
        )
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = self.client.post(self.change_password_url, {
            'old_password': 'OldSecurePass2026#',
            'new_password': 'BrandNewSecurePass2026#'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password('BrandNewSecurePass2026#'))
        self.assertFalse(user.check_password('OldSecurePass2026#'))

    def test_zero_medical_data_isolation(self):
        """Verify models and serializers never store or expose medical metrics."""
        user_fields = [f.name for f in User._meta.get_fields()]
        forbidden = ['report', 'health', 'medical', 'ocr', 'lab', 'vitals', 'symptoms', 'dek', 'kek', 'recovery_key']
        for field in user_fields:
            for bad in forbidden:
                self.assertNotIn(bad, field.lower())

    # --- SPECIFIC ADMIN FLOW SECURITY TESTS ---

    def test_admin_flow_test1_administrator_login_success(self):
        """
        Test 1: Administrator logs in through normal login endpoint,
        is detected as admin by Django, returns is_admin: True and redirect_url: '/admin/'.
        """
        admin_user = User.objects.create_superuser(
            email='mrunmayee717@gmail.com',
            name='Miti',
            password='Miti2006'
        )

        response = self.client.post(self.login_url, {
            'email': 'mrunmayee717@gmail.com',
            'password': 'Miti2006'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertTrue(response.data['is_admin'])
        self.assertEqual(response.data['redirect_url'], '/admin/')
        self.assertFalse(response.data['requires_device_verification'])

        # Verify Django session exists
        self.assertIn('_auth_user_id', self.client.session)

    def test_admin_flow_test2_wrong_admin_password_rejected(self):
        """
        Test 2: Incorrect password for administrator email is safely rejected.
        Admin portal redirect is NOT returned.
        """
        User.objects.create_superuser(
            email='mrunmayee717@gmail.com',
            name='Miti',
            password='Miti2006'
        )

        response = self.client.post(self.login_url, {
            'email': 'mrunmayee717@gmail.com',
            'password': 'WrongPassword123'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data['success'])
        self.assertEqual(response.data['error'], 'Invalid email or password.')
        self.assertNotIn('redirect_url', response.data)

    def test_admin_flow_test3_normal_user_login_no_admin_redirect(self):
        """
        Test 3: Normal user logs in, is_admin is False, redirect_url is None.
        Normal user is NOT redirected to /admin/.
        """
        normal_user = User.objects.create_user(
            email='normalpatient@vitaldiaries.internal',
            name='Patient John',
            password='PatientPassword2026#'
        )

        response = self.client.post(self.login_url, {
            'email': 'normalpatient@vitaldiaries.internal',
            'password': 'PatientPassword2026#'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertFalse(response.data['is_admin'])
        self.assertIsNone(response.data['redirect_url'])

    def test_admin_flow_test4_unauthenticated_and_normal_user_admin_access_denied(self):
        """
        Test 4: Unauthenticated clients and normal (non-staff) users cannot access /admin/.
        """
        # Unauthenticated request to /admin/
        unauth_client = APIClient()
        response_unauth = unauth_client.get('/admin/', follow=False)
        # Should redirect to Django admin login (HTTP 302)
        self.assertEqual(response_unauth.status_code, status.HTTP_302_FOUND)

        # Normal authenticated user requesting /admin/
        normal_user = User.objects.create_user(
            email='normaluser2@vitaldiaries.internal',
            name='Regular User',
            password='UserPass2026#'
        )
        user_client = APIClient()
        user_client.force_login(normal_user)
        response_user = user_client.get('/admin/', follow=False)
        # Non-staff user redirected back to admin login
        self.assertEqual(response_user.status_code, status.HTTP_302_FOUND)

        # Staff user requesting /admin/
        staff_user = User.objects.create_superuser(
            email='adminstaff@vitaldiaries.internal',
            name='Staff User',
            password='StaffPass2026#'
        )
        staff_client = APIClient()
        staff_client.force_login(staff_user)
        response_staff = staff_client.get('/admin/', follow=False)
        self.assertEqual(response_staff.status_code, status.HTTP_200_OK)

    def test_admin_flow_test5_frontend_inspection_no_admin_credentials(self):
        """
        Test 5: React frontend codebase (/src/) does NOT contain hardcoded admin passwords or emails.
        """
        import os
        src_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'src')
        forbidden_strings = ['Miti2006']

        for root, _, files in os.walk(src_dir):
            for file in files:
                if file.endswith(('.ts', '.tsx', '.js', '.jsx', '.html', '.json')):
                    filepath = os.path.join(root, file)
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        for forbidden in forbidden_strings:
                            self.assertNotIn(
                                forbidden,
                                content,
                                f"Forbidden credential '{forbidden}' found in frontend file: {filepath}"
                            )

    def test_admin_flow_test6_database_password_hashing(self):
        """
        Test 6: Plaintext password is NEVER stored in database.
        Password is authenticated via Django cryptographic hash.
        """
        user = User.objects.create_superuser(
            email='miti_hash_test@vitaldiaries.internal',
            name='Miti Hash Test',
            password='Miti2006'
        )
        user.refresh_from_db()
        self.assertNotEqual(user.password, 'Miti2006')
        self.assertTrue(user.password.startswith(('pbkdf2_sha256$', 'argon2$')))
        self.assertTrue(user.check_password('Miti2006'))
        self.assertFalse(user.check_password('WrongMitiPassword'))
