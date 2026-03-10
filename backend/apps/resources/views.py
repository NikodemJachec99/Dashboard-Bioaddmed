from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsAdminUserExtended

from apps.resources.models import Reservation, Resource
from apps.resources.serializers import ReservationSerializer, ResourceSerializer


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all().select_related("caretaker")
    serializer_class = ResourceSerializer
    filterset_fields = ["is_active", "caretaker"]
    search_fields = ["title", "description", "location"]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAdminUserExtended()]
        return [IsAuthenticated()]


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.all().select_related("resource", "reserved_by")
    serializer_class = ReservationSerializer
    filterset_fields = ["resource", "status", "reserved_by"]

    def get_permissions(self):
        if self.action in {"update", "partial_update", "destroy"}:
            return [IsAdminUserExtended()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reserved_by=self.request.user)
