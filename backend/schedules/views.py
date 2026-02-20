from datetime import datetime, date
from collections import defaultdict, OrderedDict
import calendar

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Schedule
from .serializers import ScheduleSerializer


class ScheduleViewSet(viewsets.ModelViewSet):
    """
    CRUD for schedules.
    GET  /api/schedules/           — list (supports ?year=&month= filters)
    POST /api/schedules/           — create
    PUT  /api/schedules/<id>/      — full update
    PATCH /api/schedules/<id>/     — partial update
    DELETE /api/schedules/<id>/    — delete
    """
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year and month:
            qs = qs.filter(
                start_time__year=int(year),
                start_time__month=int(month),
            )
        return qs


@api_view(['GET'])
def analytics_view(request):
    """
    GET /api/analytics/?year=2026
    Returns aggregated analytics for the dashboard.
    """
    now = timezone.now()
    year = int(request.query_params.get('year', now.year))
    schedules = Schedule.objects.filter(start_time__year=year)

    # --- Status breakdown (Past / Current / Future) ---
    today = now.date()
    past = 0
    current = 0
    future = 0
    for s in schedules:
        s_date = s.start_time.date()
        e_date = s.end_time.date()
        if e_date < today:
            past += 1
        elif s_date > today:
            future += 1
        else:
            current += 1

    # --- Progress tracking ---
    progress = {
        'cancelled': schedules.filter(status='Cancelled').count(),
        'completed': schedules.filter(status='Completed').count(),
        'in_progress': schedules.filter(status='In Progress').count(),
        'not_started': schedules.filter(status='Not Started').count(),
    }

    # --- Engagement type ---
    engagement = {
        'online': schedules.filter(mode='Online').count(),
        'in_person': schedules.filter(mode='In-Person').count(),
    }

    # --- Monthly booked count ---
    monthly = OrderedDict()
    for m in range(1, 13):
        month_name = calendar.month_abbr[m]
        monthly[month_name] = schedules.filter(start_time__month=m).count()

    monthly_booked = [{'month': k, 'count': v} for k, v in monthly.items()]

    # --- Daily booked count (current month) ---
    current_month = int(request.query_params.get('month', now.month))
    month_schedules = schedules.filter(start_time__month=current_month)
    daily_counts = defaultdict(int)
    for s in month_schedules:
        day_str = s.start_time.strftime('%Y-%m-%d')
        daily_counts[day_str] += 1

    daily_booked = [{'date': k, 'count': v} for k, v in sorted(daily_counts.items())]

    # --- Available days per month ---
    available_days = []
    for m in range(1, 13):
        month_name = calendar.month_abbr[m]
        total_days = calendar.monthrange(year, m)[1]
        booked_days = set()
        for s in schedules.filter(start_time__month=m):
            booked_days.add(s.start_time.day)
        available_days.append({
            'month': month_name,
            'total_days': total_days,
            'booked_days': len(booked_days),
            'available': total_days - len(booked_days),
        })

    return Response({
        'year': year,
        'status_breakdown': {
            'past': past,
            'current': current,
            'future': future,
        },
        'progress': progress,
        'engagement': engagement,
        'monthly_booked': monthly_booked,
        'daily_booked': daily_booked,
        'available_days': available_days,
    })
