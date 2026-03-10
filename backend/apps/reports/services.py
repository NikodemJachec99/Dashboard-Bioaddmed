from pathlib import Path

from apps.reports.models import ReportSnapshot


def generate_report(*, report_type: str, generated_by, parameters: dict):
    file_name = f"{report_type}-{generated_by.id if generated_by else 'system'}.json"
    relative_path = f"reports/{file_name}"
    return ReportSnapshot.objects.create(
        report_type=report_type,
        generated_by=generated_by,
        parameters_json=parameters,
        file_path=relative_path,
    )

