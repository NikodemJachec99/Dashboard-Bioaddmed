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

    def validate(self, attrs):
        start_at = attrs.get("start_at", getattr(self.instance, "start_at", None))
        end_at = attrs.get("end_at", getattr(self.instance, "end_at", None))
        resource = attrs.get("resource", getattr(self.instance, "resource", None))
        if start_at and end_at and start_at >= end_at:
            raise serializers.ValidationError("Data zakończenia musi być późniejsza niż data rozpoczęcia.")
        if resource and start_at and end_at:
            conflicts = Reservation.objects.filter(
                resource=resource,
                status__in=[Reservation.Status.PENDING, Reservation.Status.APPROVED],
                start_at__lt=end_at,
                end_at__gt=start_at,
            )
            if self.instance:
                conflicts = conflicts.exclude(pk=self.instance.pk)
            if conflicts.exists():
                raise serializers.ValidationError("Zasób jest już zarezerwowany w tym czasie.")
        return attrs
