from django.contrib import admin

from apps.resources.models import Reservation, Resource

admin.site.register(Resource)
admin.site.register(Reservation)

