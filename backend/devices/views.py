from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import Device, DeviceVerificationRequest
from .serializers import DeviceSerializer, DeviceVerificationRequestSerializer
from activity.models import LoginEvent

class DeviceListView(views.APIView):
    """
    GET /api/devices/
    List all registered devices for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        devices = request.user.devices.all()
        serializer = DeviceSerializer(devices, many=True)
        return Response({
            'success': True,
            'devices': serializer.data
        })


class TrustDeviceView(views.APIView):
    """
    POST /api/devices/trust/
    Explicitly marks a device as trusted for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        device_id = request.data.get('device_id')
        if not device_id:
            return Response({'success': False, 'error': 'device_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        device = get_object_or_404(Device, user=request.user, device_id=device_id)
        device.mark_trusted()

        LoginEvent.log(
            event_type='DEVICE_TRUSTED',
            user=request.user,
            success=True,
            device=device,
            request=request
        )

        return Response({
            'success': True,
            'message': f"Device '{device.device_name}' marked as trusted.",
            'device': DeviceSerializer(device).data
        })


class RevokeDeviceView(views.APIView):
    """
    POST /api/devices/revoke/
    Revokes access for a specific device.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        device_id = request.data.get('device_id')
        if not device_id:
            return Response({'success': False, 'error': 'device_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        device = get_object_or_404(Device, user=request.user, device_id=device_id)
        device.revoke()

        LoginEvent.log(
            event_type='DEVICE_REVOKED',
            user=request.user,
            success=True,
            device=device,
            request=request
        )

        return Response({
            'success': True,
            'message': f"Device '{device.device_name}' has been revoked.",
            'device': DeviceSerializer(device).data
        })


class DeviceVerificationRequestView(views.APIView):
    """
    POST /api/device-verification/request/
    Initiates an authorization request for an untrusted device.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        device_id = request.data.get('device_id')
        if not device_id:
            return Response({'success': False, 'error': 'device_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        device = get_object_or_404(Device, user=request.user, device_id=device_id)
        
        # Check for existing pending request or create new
        verification_req, created = DeviceVerificationRequest.objects.get_or_create(
            user=request.user,
            device=device,
            status='PENDING',
            defaults={'status': 'PENDING'}
        )

        return Response({
            'success': True,
            'request_id': str(verification_req.id),
            'status': verification_req.status,
            'device': DeviceSerializer(device).data
        })


class DeviceVerificationApproveView(views.APIView):
    """
    POST /api/device-verification/approve/
    Approves a pending device verification request from an existing trusted device.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id')
        approved = request.data.get('approved', True)

        if not request_id:
            return Response({'success': False, 'error': 'request_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        verification_req = get_object_or_404(DeviceVerificationRequest, id=request_id, user=request.user)

        if approved:
            verification_req.status = 'APPROVED'
            verification_req.resolved_at = timezone.now()
            verification_req.save(update_fields=['status', 'resolved_at'])

            verification_req.device.mark_trusted()

            LoginEvent.log(
                event_type='DEVICE_TRUSTED',
                user=request.user,
                success=True,
                device=verification_req.device,
                request=request
            )

            return Response({
                'success': True,
                'message': f"Device '{verification_req.device.device_name}' approved and trusted.",
                'device': DeviceSerializer(verification_req.device).data
            })
        else:
            verification_req.status = 'REJECTED'
            verification_req.resolved_at = timezone.now()
            verification_req.save(update_fields=['status', 'resolved_at'])

            return Response({
                'success': True,
                'message': "Device verification rejected."
            })


class DeviceVerificationRecoveryView(views.APIView):
    """
    POST /api/device-verification/recovery/
    Acknowledge client-side recovery authorization.
    IMPORTANT: The plaintext Recovery Key is NOT received or stored by Django.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        device_id = request.data.get('device_id')
        recovery_confirmed = request.data.get('recovery_confirmed', False)

        if not device_id or not recovery_confirmed:
            return Response({
                'success': False,
                'error': 'device_id and recovery_confirmed are required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        device = get_object_or_404(Device, user=request.user, device_id=device_id)
        device.mark_trusted()

        LoginEvent.log(
            event_type='RECOVERY_USED',
            user=request.user,
            success=True,
            device=device,
            request=request
        )
        LoginEvent.log(
            event_type='DEVICE_TRUSTED',
            user=request.user,
            success=True,
            device=device,
            request=request
        )

        return Response({
            'success': True,
            'message': 'Device authorized via recovery verification.',
            'device': DeviceSerializer(device).data
        })
