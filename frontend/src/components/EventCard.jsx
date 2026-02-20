import { format } from 'date-fns';
import './EventCard.css';

export default function EventCard({ schedule, onClick }) {
    const modeClass = schedule.mode === 'Online' ? 'online' : 'in-person';
    const time = format(new Date(schedule.start_time), 'h:mm a');

    return (
        <div className={`event-card ${modeClass}`} onClick={() => onClick?.(schedule)} title={schedule.task_name}>
            <span className="event-time">{time}</span>
            <span className="event-name">{schedule.task_name}</span>
        </div>
    );
}
