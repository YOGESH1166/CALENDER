import { useState, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import Calendar from '../components/Calendar';
import TaskModal from '../components/TaskModal';
import { fetchSchedules, createSchedule, updateSchedule, deleteSchedule } from '../api/schedules';
import './CalendarPage.css';

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [editingSchedule, setEditingSchedule] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    const loadSchedules = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchSchedules(year, month);
            setSchedules(Array.isArray(data) ? data : []);
        } catch {
            setSchedules([]);
        }
        setLoading(false);
    }, [year, month]);

    useEffect(() => {
        loadSchedules();
    }, [loadSchedules]);

    const handlePrev = () => setCurrentDate((d) => subMonths(d, 1));
    const handleNext = () => setCurrentDate((d) => addMonths(d, 1));

    const handleDateClick = (dateStr) => {
        setSelectedDate(dateStr);
        setEditingSchedule(null);
        setModalOpen(true);
    };

    const handleEventClick = (schedule) => {
        const dateStr = format(new Date(schedule.start_time), 'yyyy-MM-dd');
        setSelectedDate(dateStr);
        setEditingSchedule(schedule);
        setModalOpen(true);
    };

    const handleSave = async (payload, existingId) => {
        try {
            if (existingId) {
                await updateSchedule(existingId, payload);
            } else {
                await createSchedule(payload);
            }
            setModalOpen(false);
            loadSchedules();
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteSchedule(id);
            setModalOpen(false);
            loadSchedules();
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    return (
        <div className="calendar-page">
            <div className="page-top-bar">
                <div className="page-title">
                    <span className="title-icon">📅</span>
                    <h1>
                        <span className="title-accent">Cal</span>endar
                    </h1>
                </div>
                <div className="page-actions">
                    <span className="notification-badge">
                        📋 {schedules.length} events this month
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="loading-overlay">⏳ Loading schedules…</div>
            ) : (
                <Calendar
                    currentDate={currentDate}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    schedules={schedules}
                    onDateClick={handleDateClick}
                    onEventClick={handleEventClick}
                />
            )}

            <TaskModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                onDelete={handleDelete}
                selectedDate={selectedDate}
                editingSchedule={editingSchedule}
            />
        </div>
    );
}
