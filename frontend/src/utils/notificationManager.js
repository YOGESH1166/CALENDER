/**
 * Notification Manager — handles browser notification reminders for schedules.
 * Checks every 30 seconds if any upcoming schedule needs a reminder.
 */

const STORAGE_KEY = 'cal_schedules';
const NOTIFIED_KEY = 'cal_notified_ids';

let checkInterval = null;

/** Request notification permission */
export async function initNotifications() {
    if (!('Notification' in window)) {
        console.log('Browser does not support notifications');
        return;
    }

    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
    }

    // Start checking for reminders
    startReminderCheck();
}

/** Get schedules from localStorage */
function getSchedules() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

/** Get IDs already notified (to avoid duplicates) */
function getNotifiedIds() {
    try {
        return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]');
    } catch {
        return [];
    }
}

function addNotifiedId(id) {
    const ids = getNotifiedIds();
    ids.push(id);
    // Keep only last 500 IDs
    if (ids.length > 500) ids.splice(0, ids.length - 500);
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(ids));
}

/** Check if any schedule needs a reminder RIGHT NOW */
function checkReminders() {
    if (Notification.permission !== 'granted') return;

    const schedules = getSchedules();
    const now = new Date();
    const notifiedIds = getNotifiedIds();

    schedules.forEach((s) => {
        if (!s.reminder_minutes || s.reminder_minutes <= 0) return;
        if (s.status === 'Cancelled' || s.status === 'Completed') return;

        const startTime = new Date(s.start_time);
        const reminderTime = new Date(startTime.getTime() - s.reminder_minutes * 60 * 1000);

        // Unique key: schedule id + date (so we don't re-notify)
        const notifyKey = `${s.id}_${s.start_time}`;
        if (notifiedIds.includes(notifyKey)) return;

        // Check if we're within the reminder window (reminder time <= now < start time)
        const diffMs = reminderTime.getTime() - now.getTime();
        if (diffMs <= 0 && now < startTime) {
            fireNotification(s);
            addNotifiedId(notifyKey);
        }
    });
}

/** Fire a browser notification */
function fireNotification(schedule) {
    const startTime = new Date(schedule.start_time);
    const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    const modeIcon = schedule.mode === 'Online' ? '💻' : '🏢';

    const title = `⏰ Reminder: ${schedule.task_name}`;
    const body = `${modeIcon} ${schedule.mode} at ${timeStr}\nStarting in ${schedule.reminder_minutes} min`;

    try {
        // Try service worker notification (works in background)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(title, {
                    body,
                    icon: '/icon.svg',
                    badge: '/icon.svg',
                    tag: schedule.id,
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    data: { url: '/' },
                });
            });
        } else {
            // Fallback to regular notification
            new Notification(title, {
                body,
                icon: '/icon.svg',
                tag: schedule.id,
            });
        }
    } catch (err) {
        console.error('Notification failed:', err);
    }
}

/** Start the periodic reminder check */
function startReminderCheck() {
    if (checkInterval) return;
    // Check every 30 seconds
    checkInterval = setInterval(checkReminders, 30 * 1000);
    // Also check immediately
    checkReminders();
}

/** Stop checking (cleanup) */
export function stopReminderCheck() {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}
