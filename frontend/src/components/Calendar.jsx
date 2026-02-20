import { useMemo } from 'react';
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
    isToday,
    isSameDay,
} from 'date-fns';
import EventCard from './EventCard';
import './Calendar.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_EVENTS = 3;

export default function Calendar({
    currentDate,
    onPrev,
    onNext,
    schedules,
    onDateClick,
    onEventClick,
}) {
    const days = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calStart = startOfWeek(monthStart);
        const calEnd = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: calStart, end: calEnd });
    }, [currentDate]);

    const eventsByDate = useMemo(() => {
        const map = {};
        (schedules || []).forEach((s) => {
            const key = format(new Date(s.start_time), 'yyyy-MM-dd');
            if (!map[key]) map[key] = [];
            map[key].push(s);
        });
        return map;
    }, [schedules]);

    return (
        <div className="calendar-wrapper">
            <div className="calendar-header">
                <h2>
                    <span className="month-name">{format(currentDate, 'MMMM')}</span>{' '}
                    {format(currentDate, 'yyyy')}
                </h2>
                <div className="calendar-nav">
                    <button onClick={onPrev} title="Previous month">
                        ‹
                    </button>
                    <button onClick={onNext} title="Next month">
                        ›
                    </button>
                </div>
            </div>

            <div className="calendar-grid">
                {WEEKDAYS.map((d) => (
                    <div className="day-header" key={d}>
                        {d}
                    </div>
                ))}

                {days.map((day) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate[key] || [];
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const today = isToday(day);

                    return (
                        <div
                            key={key}
                            className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${today ? 'today' : ''}`}
                            onClick={() => onDateClick(key)}
                        >
                            <div className="day-number">{format(day, 'd')}</div>
                            <div className="day-events">
                                {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((ev) => (
                                    <div key={ev.id} onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick(ev);
                                    }}>
                                        <EventCard schedule={ev} />
                                    </div>
                                ))}
                                {dayEvents.length > MAX_VISIBLE_EVENTS && (
                                    <div className="day-more">
                                        +{dayEvents.length - MAX_VISIBLE_EVENTS} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
