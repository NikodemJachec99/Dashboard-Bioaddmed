from django.contrib import admin

from apps.meetings.models import Meeting, MeetingActionItem, MeetingParticipant

admin.site.register(Meeting)
admin.site.register(MeetingParticipant)
admin.site.register(MeetingActionItem)
