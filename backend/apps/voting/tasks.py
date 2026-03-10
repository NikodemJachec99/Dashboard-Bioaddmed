from celery import shared_task
from django.utils import timezone

from apps.voting.models import VotePoll
from apps.voting.services import close_poll


@shared_task
def close_expired_polls():
    queryset = VotePoll.objects.filter(status=VotePoll.Status.ACTIVE, ends_at__lt=timezone.now())
    for poll in queryset:
        close_poll(poll)

