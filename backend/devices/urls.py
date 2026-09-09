from django.urls import path
from .views import (
    DeviceListView,
    TrustDeviceView,
    RevokeDeviceView,
    DeviceVerificationRequestView,
    DeviceVerificationApproveView,
    DeviceVerificationRecoveryView,
)

urlpatterns = [
    path('', DeviceListView.as_view(), name='device-list'),
    path('trust/', TrustDeviceView.as_view(), name='device-trust'),
    path('revoke/', RevokeDeviceView.as_view(), name='device-revoke'),
    path('verification/request/', DeviceVerificationRequestView.as_view(), name='device-verification-request'),
    path('verification/approve/', DeviceVerificationApproveView.as_view(), name='device-verification-approve'),
    path('verification/recovery/', DeviceVerificationRecoveryView.as_view(), name='device-verification-recovery'),
]
