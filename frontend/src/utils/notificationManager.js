/**
 * Notification Manager — handles browser notification reminders for schedules.
 * Checks every 30 seconds if any upcoming schedule needs a reminder.
 * Plays alarm ringtone when reminder fires.
 */

import { playRingtone } from './ringtones';

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

        const notifyKey = `${s.id}_${s.start_time}`;
        if (notifiedIds.includes(notifyKey)) return;

        // Check if we're within the reminder window
        const diffMs = reminderTime.getTime() - now.getTime();
        if (diffMs <= 0 && now < startTime) {
            fireNotification(s);
            addNotifiedId(notifyKey);
        }
    });
}

/** Fire a browser notification AND play alarm ringtone */
function fireNotification(schedule) {
    const startTime = new Date(schedule.start_time);
    const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    const modeIcon = schedule.mode === 'Online' ? '💻' : '🏢';

    const title = `⏰ Reminder: ${schedule.task_name}`;
    const body = `${modeIcon} ${schedule.mode} at ${timeStr}\nStarting in ${schedule.reminder_minutes} min`;

    // 🔊 Play the alarm ringtone
    const ringtoneId = schedule.ringtone_id || 1;
    playRingtone(ringtoneId, 3); // Play 3 times

    try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(title, {
                    body,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    tag: schedule.id,
                    vibrate: [500, 250, 500, 250, 500, 250, 500],
                    requireInteraction: true,
                    silent: false, // Force system notification sound even if backgrounded
                    data: { url: '/' },
                });
            });
        } else {
            new Notification(title, {
                body,
                icon: '/icon-192.png',
                tag: schedule.id,
                silent: false,
            });
        }
    } catch (err) {
        console.error('Notification failed:', err);
    }
}

/** Start the periodic reminder check */
function startReminderCheck() {
    if (checkInterval) return;
    checkInterval = setInterval(checkReminders, 30 * 1000);
    checkReminders();
}

/** Stop checking (cleanup) */
export function stopReminderCheck() {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}
