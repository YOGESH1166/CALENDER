import { useState, useEffect, useCallback } from 'react';
import { fetchAnalytics, fetchSchedules } from '../api/schedules';
import './Dashboard.css';

const MONTH_CLASSES = {
    Jan: 'jan', Feb: 'feb', Mar: 'mar', Apr: 'apr', May: 'may', Jun: 'jun',
    Jul: 'jul', Aug: 'aug', Sep: 'sep', Oct: 'oct', Nov: 'nov', Dec: 'dec',
};

async function fetchAllSchedulesForYear(year) {
    const promises = [];
    for (let m = 1; m <= 12; m++) {
        promises.push(fetchSchedules(year, m));
    }
    const results = await Promise.all(promises);
    const all = results.flat();
    // Deduplicate by id
    const seen = new Set();
    return all.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

export default function Dashboard() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [res, allSchedules] = await Promise.all([
                fetchAnalytics(year),
                fetchAllSchedulesForYear(year),
            ]);
            setData(res);
            setSchedules(allSchedules);
        } catch {
            setData(null);
            setSchedules([]);
        }
        setLoading(false);
    }, [year]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return <div className="dashboard"><div className="loading-overlay">⏳ Loading analytics…</div></div>;
    }

    const d = data || {
        status_table: [],
        totals_row: {},
        available_days_summary: [],
        monthly_booked: [],
        daily_by_month: {},
        available_dates_by_month: {},
        today: new Date().toISOString().slice(0, 10),
    };

    const todayFormatted = d.today || new Date().toISOString().slice(0, 10);

    return (
        <div className="dashboard">
            {/* === Header === */}
            <div className="dashboard-header">
                <h1>📊 <span className="dash-accent">Schedule</span> Analytics</h1>
                <div className="header-info">
                    <span className="info-item">Today: <span className="info-value">{todayFormatted}</span></span>
                    <div className="year-selector">
                        <button onClick={() => setYear(y => y - 1)}>‹</button>
                        <span>{year}</span>
                        <button onClick={() => setYear(y => y + 1)}>›</button>
                    </div>
                </div>
            </div>

            {/* === Schedule Details Table === */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="section-title">📋 All Schedule Details ({schedules.length} entries)</div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="spreadsheet schedule-details-table">
                        <thead>
                            <tr>
                                <th style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>#</th>
                                <th className="hdr-current">Date</th>
                                <th className="hdr-current">Day</th>
                                <th className="hdr-past">Start</th>
                                <th className="hdr-past">End</th>
                                <th className="hdr-future">Task Name</th>
                                <th className="sub-online">Mode</th>
                                <th className="sub-total">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedules.length === 0 && (
                                <tr><td colSpan={8} style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>No schedules yet — create one from the Calendar page</td></tr>
                            )}
                            {schedules.map((s, i) => {
                                const start = new Date(s.start_time);
                                const end = new Date(s.end_time);
                                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                const dateStr = `${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
                                const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                                const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                                const isOnline = s.mode === 'Online';
                                return (
                                    <tr key={s.id}>
                                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td className="label-cell">{dateStr}</td>
                                        <td>{dayNames[start.getDay()]}</td>
                                        <td>{startTime}</td>
                                        <td>{endTime}</td>
                                        <td className="label-cell" style={{ textAlign: 'left', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.task_name}</td>
                                        <td className={isOnline ? 'val-online' : 'val-inperson'}>
                                            {isOnline ? '💻 Online' : '🏢 In-Person'}
                                        </td>
                                        <td><span className={`status-badge status-${s.status.toLowerCase().replace(/\s+/g, '-')}`}>{s.status}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* === TOP: Status Breakdown + Available Days === */}
            <div className="top-grid">
                {/* Status Breakdown Table */}
                <div>
                    <div className="section-title">Status Breakdown</div>
                    <table className="spreadsheet">
                        <thead>
                            <tr>
                                <th rowSpan={2} style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}></th>
                                <th colSpan={3} className="hdr-past">Past</th>
                                <th colSpan={3} className="hdr-current">Current</th>
                                <th colSpan={3} className="hdr-future">Future</th>
                            </tr>
                            <tr>
                                <th className="sub-online">Online</th>
                                <th className="sub-inperson">In-Person</th>
                                <th className="sub-total">Total</th>
                                <th className="sub-online">Online</th>
                                <th className="sub-inperson">In-Person</th>
                                <th className="sub-total">Total</th>
                                <th className="sub-online">Online</th>
                                <th className="sub-inperson">In-Person</th>
                                <th className="sub-total">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Totals row first (like the image) */}
                            {d.totals_row && (
                                <tr className="totals-row">
                                    <td className="label-cell">Total</td>
                                    <td className="val-online">{d.totals_row.past_online || 0}</td>
                                    <td className="val-inperson">{d.totals_row.past_inperson || 0}</td>
                                    <td className="val-total">{d.totals_row.past_total || 0}</td>
                                    <td className="val-online">{d.totals_row.current_online || 0}</td>
                                    <td className="val-inperson">{d.totals_row.current_inperson || 0}</td>
                                    <td className="val-total">{d.totals_row.current_total || 0}</td>
                                    <td className="val-online">{d.totals_row.future_online || 0}</td>
                                    <td className="val-inperson">{d.totals_row.future_inperson || 0}</td>
                                    <td className="val-total">{d.totals_row.future_total || 0}</td>
                                </tr>
                            )}
                            {d.status_table.map((row) => (
                                <tr key={row.status}>
                                    <td className="label-cell">{row.status}</td>
                                    <td className="val-online">{row.past_online}</td>
                                    <td className="val-inperson">{row.past_inperson}</td>
                                    <td className="val-total">{row.past_total}</td>
                                    <td className="val-online">{row.current_online}</td>
                                    <td className="val-inperson">{row.current_inperson}</td>
                                    <td className="val-total">{row.current_total}</td>
                                    <td className="val-online">{row.future_online}</td>
                                    <td className="val-inperson">{row.future_inperson}</td>
                                    <td className="val-total">{row.future_total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Available Days Summary */}
                <div>
                    <div className="section-title">Available Days</div>
                    <table className="spreadsheet">
                        <thead>
                            <tr>
                                <th style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}></th>
                                <th className="hdr-avail">Available</th>
                                <th className="sub-online">Online</th>
                                <th className="sub-inperson">In-Person</th>
                                <th style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--text-secondary)', fontSize: '0.65rem' }}>Sat</th>
                                <th style={{ background: 'rgba(251,113,133,0.1)', color: 'var(--accent-rose)', fontSize: '0.65rem' }}>Sun</th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.available_days_summary.filter(r => r.available > 0 || r.online > 0 || r.in_person > 0).map((row) => (
                                <tr key={row.month}>
                                    <td className="label-cell">{row.month}</td>
                                    <td className="val-avail">{row.available}</td>
                                    <td className="val-online">{row.online}</td>
                                    <td className="val-inperson">{row.in_person}</td>
                                    <td>{row.sat}</td>
                                    <td>{row.sun}</td>
                                </tr>
                            ))}
                            {d.available_days_summary.filter(r => r.available > 0 || r.online > 0 || r.in_person > 0).length === 0 && (
                                <tr><td colSpan={6} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No data</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* === BOTTOM: Weekly Booked Count + Daily Booked + Available Dates === */}
            <div className="bottom-grid">
                {/* Weekly / Monthly Booked Count */}
                <div>
                    <div className="section-title">Monthly Booked Count</div>
                    <table className="spreadsheet">
                        <thead>
                            <tr>
                                <th style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>Week</th>
                                <th className="sub-online">Online</th>
                                <th className="sub-inperson">In-Person</th>
                                <th className="sub-total">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.monthly_booked.length === 0 && (
                                <tr><td colSpan={4} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No data</td></tr>
                            )}
                            {d.monthly_booked.map((row) => (
                                <tr key={row.week}>
                                    <td className="label-cell">{row.week}</td>
                                    <td className="val-online">{row.online}</td>
                                    <td className="val-inperson">{row.in_person}</td>
                                    <td className="val-total">{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Daily Booked Count by Month */}
                <div>
                    <div className="section-title">Daily Booked Count</div>
                    <div className="daily-section">
                        {Object.entries(d.daily_by_month).map(([month, days]) => (
                            <div key={month} className={`daily-month-col ${MONTH_CLASSES[month] || ''}`}>
                                <div className="month-header">{month}</div>
                                <table className="spreadsheet">
                                    <thead>
                                        <tr>
                                            <th style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)', fontSize: '0.6rem' }}>Date</th>
                                            <th style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)', fontSize: '0.6rem' }}>Day</th>
                                            <th className="sub-online" style={{ fontSize: '0.6rem' }}>On</th>
                                            <th className="sub-inperson" style={{ fontSize: '0.6rem' }}>IP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {days.map((row) => (
                                            <tr key={row.date}>
                                                <td className="label-cell">{row.date}</td>
                                                <td>{row.day}</td>
                                                <td className="val-online">{row.online}</td>
                                                <td className="val-inperson">{row.in_person}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                        {Object.keys(d.daily_by_month).length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No booked days yet</p>
                        )}
                    </div>
                </div>

                {/* Available Dates by Month */}
                <div>
                    <div className="section-title">Available Dates</div>
                    <div className="avail-dates-section">
                        {Object.entries(d.available_dates_by_month).slice(0, 3).map(([month, dates]) => (
                            <div key={month} className={`avail-month-col ${MONTH_CLASSES[month] || ''}`}>
                                <div className="month-header">{month}</div>
                                <table className="spreadsheet">
                                    <tbody>
                                        {dates.slice(0, 15).map((row) => (
                                            <tr key={row.date}>
                                                <td className="label-cell">{row.date}</td>
                                                <td>{row.day}</td>
                                            </tr>
                                        ))}
                                        {dates.length > 15 && (
                                            <tr><td colSpan={2} style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>+{dates.length - 15} more</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                        {Object.keys(d.available_dates_by_month).length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No data</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
