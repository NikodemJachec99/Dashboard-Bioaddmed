from apps.notifications.models import Notification


def create_in_app_notification(*, user, title: str, message: str, url: str = ""):
    if not user:
        return None
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        url=url,
        channel=Notification.Channel.IN_APP,
        status=Notification.Status.SENT,
    )
