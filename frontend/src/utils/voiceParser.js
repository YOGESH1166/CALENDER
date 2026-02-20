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

    // Extract task description
    // Remove time-related fragments and keywords
    let description = text
        .replace(/schedule\s*(a|an)?\s*/gi, '')
        .replace(/book\s*(a|an)?\s*/gi, '')
        .replace(/set\s*up\s*(a|an)?\s*/gi, '')
        .replace(/create\s*(a|an)?\s*/gi, '')
        .replace(/\b(at|from|to|for|about|regarding)\b/gi, ' ')
        .replace(/\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?/g, '')
        .replace(/\b(online|in-person|in person|offline)\b/gi, '')
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
