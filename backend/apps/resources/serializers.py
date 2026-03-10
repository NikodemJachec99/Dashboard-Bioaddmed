from rest_framework import serializers

from apps.resources.models import Reservation, Resource


class ResourceSerializer(serializers.ModelSerializer):
    caretaker_email = serializers.CharField(source="caretaker.email", read_only=True)

    class Meta:
        model = Resource
        fields = ["id", "title", "description", "location", "caretaker", "caretaker_email", "rules", "is_active", "created_at", "updated_at"]


class ReservationSerializer(serializers.ModelSerializer):
    reserved_by_email = serializers.CharField(source="reserved_by.email", read_only=True)

    class Meta:
        model = Reservation
        fields = ["id", "resource", "reserved_by", "reserved_by_email", "start_at", "end_at", "purpose", "status", "created_at", "updated_at"]
        read_only_fields = ["reserved_by"]

