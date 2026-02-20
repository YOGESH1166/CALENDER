import { useState, useEffect } from 'react';
import VoiceButton from './VoiceButton';
import './TaskModal.css';

const emptyForm = {
    task_name: '',
    start_time_h: '',
    end_time_h: '',
    status: 'Not Started',
    mode: 'Online',
    reminder_minutes: 0,
};

export default function TaskModal({ isOpen, onClose, onSave, onDelete, selectedDate, editingSchedule }) {
    const [form, setForm] = useState(emptyForm);
    const [transcript, setTranscript] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (editingSchedule) {
            const start = new Date(editingSchedule.start_time);
            const end = new Date(editingSchedule.end_time);
            setForm({
                task_name: editingSchedule.task_name,
                start_time_h: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
                end_time_h: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
                status: editingSchedule.status,
                mode: editingSchedule.mode,
                reminder_minutes: editingSchedule.reminder_minutes || 0,
            });
            setTranscript('');
        } else {
            setForm(emptyForm);
            setTranscript('');
        }
        setConfirmDelete(false);
    }, [editingSchedule, isOpen]);

    if (!isOpen) return null;

    const handleChange = (field) => (e) =>
        setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleModeToggle = (mode) =>
        setForm((f) => ({ ...f, mode }));

    const handleVoiceResult = (parsed, raw) => {
        setTranscript(raw);
        if (parsed) {
            setForm((f) => ({
                ...f,
                task_name: parsed.taskName || f.task_name,
                start_time_h: parsed.startTime || f.start_time_h,
                end_time_h: parsed.endTime || f.end_time_h,
                mode: parsed.mode || f.mode,
            }));
        }
    };

    const handleSubmit = () => {
        if (!form.task_name || !form.start_time_h || !form.end_time_h) return;

        const dateStr = selectedDate;
        const payload = {
            task_name: form.task_name,
            start_time: `${dateStr}T${form.start_time_h}:00`,
            end_time: `${dateStr}T${form.end_time_h}:00`,
            status: form.status,
            mode: form.mode,
            reminder_minutes: Number(form.reminder_minutes) || 0,
        };

        onSave(payload, editingSchedule?.id);
    };

    const handleDeleteClick = () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        // Second click — actually delete
        onDelete?.(editingSchedule.id);
    };

    const dateLabel = selectedDate
        ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        })
        : '';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{editingSchedule ? 'Edit Schedule' : 'New Schedule'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    📅 {dateLabel}
                </p>

                <div className="modal-body">
                    {/* Voice Input */}
                    <div className="voice-row">
                        <VoiceButton onResult={handleVoiceResult} />
                        <span className="voice-hint">
                            Say: "Meeting at 10 AM to 11 AM for Project Review"
                        </span>
                    </div>

                    {transcript && (
                        <div className="voice-transcript">🗣️ "{transcript}"</div>
                    )}

                    {/* Task Name */}
                    <div className="form-group">
                        <label>Task Description</label>
                        <input
                            type="text"
                            placeholder="e.g. Project Review Meeting"
                            value={form.task_name}
                            onChange={handleChange('task_name')}
                        />
                    </div>

                    {/* Time Pickers */}
                    <div className="time-row">
                        <div className="form-group">
                            <label>Start Time</label>
                            <input
                                type="time"
                                value={form.start_time_h}
                                onChange={handleChange('start_time_h')}
                            />
                        </div>
                        <div className="form-group">
                            <label>End Time</label>
                            <input
                                type="time"
                                value={form.end_time_h}
                                onChange={handleChange('end_time_h')}
                            />
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="form-group">
                        <label>Mode</label>
                        <div className="mode-toggle">
                            <button
                                className={form.mode === 'Online' ? 'active' : ''}
                                onClick={() => handleModeToggle('Online')}
                            >
                                💻 Online
                            </button>
                            <button
                                className={form.mode === 'In-Person' ? 'active' : ''}
                                onClick={() => handleModeToggle('In-Person')}
                            >
                                🏢 In-Person
                            </button>
                        </div>
                    </div>

                    {/* Reminder */}
                    <div className="form-group">
                        <label>🔔 Reminder</label>
                        <select value={form.reminder_minutes} onChange={handleChange('reminder_minutes')}>
                            <option value={0}>None</option>
                            <option value={5}>5 minutes before</option>
                            <option value={10}>10 minutes before</option>
                            <option value={15}>15 minutes before</option>
                            <option value={30}>30 minutes before</option>
                            <option value={60}>1 hour before</option>
                        </select>
                    </div>

                    {/* Status (for editing) */}
                    {editingSchedule && (
                        <div className="form-group">
                            <label>Status</label>
                            <select value={form.status} onChange={handleChange('status')}>
                                <option value="Not Started">Not Started</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    )}

                    {/* Inline delete confirmation banner */}
                    {confirmDelete && (
                        <div className="delete-confirm-banner">
                            ⚠️ Are you sure you want to delete <strong>"{form.task_name}"</strong>?
                        </div>
                    )}

                    {/* Actions */}
                    <div className="modal-actions">
                        {editingSchedule && !confirmDelete && (
                            <button className="btn-danger" onClick={handleDeleteClick}>
                                🗑️ Delete
                            </button>
                        )}
                        {confirmDelete && (
                            <>
                                <button className="btn-danger btn-danger-confirm" onClick={handleDeleteClick}>
                                    ⚠️ Yes, Delete
                                </button>
                                <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
                                    ↩ Back
                                </button>
                            </>
                        )}
                        {!confirmDelete && (
                            <>
                                <button className="btn-secondary" onClick={onClose}>
                                    Cancel
                                </button>
                                <button className="btn-primary" onClick={handleSubmit}>
                                    {editingSchedule ? '💾 Update' : '✨ Create'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
