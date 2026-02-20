from rest_framework import serializers
from .models import Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = [
            'id', 'user_id', 'task_name', 'start_time', 'end_time',
            'status', 'mode', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        if data.get('end_time') and data.get('start_time'):
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError(
                    "End time must be after start time."
                )
        return data
