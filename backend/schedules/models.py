from django.db import models


class Schedule(models.Model):
    STATUS_CHOICES = [
        ('Not Started', 'Not Started'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]

    MODE_CHOICES = [
        ('Online', 'Online'),
        ('In-Person', 'In-Person'),
    ]

    user_id = models.CharField(max_length=100, default='default_user')
    task_name = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Not Started')
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default='Online')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']

    def __str__(self):
        return f"{self.task_name} ({self.start_time:%Y-%m-%d %H:%M})"
