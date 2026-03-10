from celery import shared_task

from apps.notifications.models import Notification


@shared_task
def dispatch_pending_notifications():
    Notification.objects.filter(status=Notification.Status.PENDING, channel=Notification.Channel.IN_APP).update(
        status=Notification.Status.SENT
    )

