import csv
import uuid
from pathlib import Path

from django.conf import settings
from django.utils import timezone

from apps.reports.models import ReportSnapshot
from apps.tasks.models import Task
from apps.projects.models import Project
from apps.meetings.models import Meeting
from apps.voting.models import VotePoll


def generate_report(*, report_type: str, generated_by, parameters: dict):
    reports_dir = Path(settings.MEDIA_ROOT) / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"{report_type}-{generated_by.id if generated_by else 'system'}-{uuid.uuid4().hex[:8]}.csv"
    file_path = reports_dir / file_name
    now = timezone.now()
    active_projects = Project.objects.exclude(status=Project.Status.ARCHIVED).count()
    overdue_tasks = Task.objects.exclude(status=Task.Status.DONE).filter(due_date__lt=timezone.localdate()).count()
    upcoming_meetings = Meeting.objects.filter(start_at__gte=now).count()
    active_polls = VotePoll.objects.filter(status=VotePoll.Status.ACTIVE).count()
    with file_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["metric", "value"])
        writer.writerow(["report_type", report_type])
        writer.writerow(["generated_at", now.isoformat()])
        writer.writerow(["active_projects", active_projects])
        writer.writerow(["overdue_tasks", overdue_tasks])
        writer.writerow(["upcoming_meetings", upcoming_meetings])
        writer.writerow(["active_polls", active_polls])
        for key, value in sorted((parameters or {}).items()):
            writer.writerow([f"param_{key}", value])

    relative_path = f"reports/{file_name}"
    return ReportSnapshot.objects.create(
        report_type=report_type,
        generated_by=generated_by,
        parameters_json=parameters,
        file_path=relative_path,
    )
