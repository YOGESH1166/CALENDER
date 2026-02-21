/**
 * Parse a voice command into schedule fields.
 *
 * Examples:
 *   "Schedule a meeting at 10 AM to 11 AM for Project Review"
 *   "Book online session from 2 PM to 3:30 PM about Budget Planning"
 *   "Set up in-person meeting at 9 to 10 for Team Standup"
 */

const TIME_REGEX =
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/g;

function parseTime(match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3] ? match[3].toLowerCase() : null;

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    return `${hh}:${mm}`;
}

export function parseVoiceCommand(text) {
    if (!text) return null;

    const result = {
        taskName: '',
        startTime: '',
        endTime: '',
        mode: 'Online',
        reminder_minutes: undefined,
        ringtone_id: undefined,
    };

    // Detect mode
    const lowerText = text.toLowerCase();
    if (lowerText.includes('in-person') || lowerText.includes('in person') || lowerText.includes('offline')) {
        result.mode = 'In-Person';
    }

    // Extract times
    const times = [];
    let match;
    const regex = new RegExp(TIME_REGEX.source, 'gi');
    while ((match = regex.exec(text)) !== null) {
        times.push(match);
    }

    if (times.length >= 2) {
        result.startTime = parseTime(times[0]);
        result.endTime = parseTime(times[1]);
    } else if (times.length === 1) {
        result.startTime = parseTime(times[0]);
    }

    // Detect reminders
    const reminderMatch = lowerText.match(/\b(\d+)\s*min/);
    if (reminderMatch) {
        result.reminder_minutes = parseInt(reminderMatch[1], 10);
        // Map to dropdown values
        if (![5, 10, 15, 30, 60].includes(result.reminder_minutes)) {
            // Pick closest available
            const closest = [5, 10, 15, 30, 60].reduce((prev, curr) =>
                Math.abs(curr - result.reminder_minutes) < Math.abs(prev - result.reminder_minutes) ? curr : prev
            );
            result.reminder_minutes = closest;
        }
    } else if (lowerText.includes('remind') || lowerText.includes('alarm')) {
        result.reminder_minutes = 10; // default to 10 min if just "with alarm"
    }

    // Detect Ringtone hints
    if (lowerText.includes('classic') || lowerText.includes('bell')) result.ringtone_id = 1;
    else if (lowerText.includes('gentle') || lowerText.includes('chime')) result.ringtone_id = 2;
    else if (lowerText.includes('clock')) result.ringtone_id = 3;
    else if (lowerText.includes('melody') || lowerText.includes('rise')) result.ringtone_id = 4;
    else if (lowerText.includes('digital') || lowerText.includes('beep')) result.ringtone_id = 5;
    else if (lowerText.includes('soft') || lowerText.includes('wave')) result.ringtone_id = 6;
    else if (lowerText.includes('piano') || lowerText.includes('drop')) result.ringtone_id = 7;
    else if (lowerText.includes('urgent') || lowerText.includes('alert')) result.ringtone_id = 8;
    else if (lowerText.includes('sparkle')) result.ringtone_id = 9;
    else if (lowerText.includes('trumpet') || lowerText.includes('call')) result.ringtone_id = 10;
    else if (lowerText.includes('ringtone') || lowerText.includes('alarm')) result.ringtone_id = 1; // Default

    // Extract task description
    // Remove time-related fragments and keywords
    let description = text
        .replace(/schedule\s*(a|an)?\s*/gi, '')
        .replace(/book\s*(a|an)?\s*/gi, '')
        .replace(/set\s*up\s*(a|an)?\s*/gi, '')
        .replace(/create\s*(a|an)?\s*/gi, '')
        .replace(/\b(at|from|to|for|about|regarding)\b/gi, ' ')
        .replace(/\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?/g, '')
        .replace(/\b(\d+)\s*min(utes)?\s*(before)?\b/gi, '')
        .replace(/\b(online|in-person|in person|offline)\b/gi, '')
        .replace(/\b(remind\s*me|with\s*alarm|ringtone)\b/gi, '')
        .replace(/\b(classic|bell|gentle|chime|clock|melody|rise|digital|beep|soft|wave|piano|drop|urgent|alert|sparkle|trumpet|call)\b/gi, '')
        .replace(/\b(meeting|session|appointment|event)\b/gi, (m) => m)
        .replace(/\s{2,}/g, ' ')
        .trim();

    // Capitalize first letter
    if (description) {
        description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    result.taskName = description || 'New Meeting';

    return result;
}
