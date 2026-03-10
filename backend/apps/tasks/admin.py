from django.contrib import admin

from apps.tasks.models import KanbanBoard, KanbanColumn, Task, TaskChecklistItem, TaskComment, TaskTag

admin.site.register(KanbanBoard)
admin.site.register(KanbanColumn)
admin.site.register(Task)
admin.site.register(TaskTag)
admin.site.register(TaskComment)
admin.site.register(TaskChecklistItem)
