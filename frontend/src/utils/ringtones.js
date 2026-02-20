/**
 * Alarm Ringtones — 10 built-in tones using Web Audio API.
 * No external files needed.
 */

const AudioContext = window.AudioContext || window.webkitAudioContext;

const RINGTONES = [
    { id: 1, name: '🔔 Classic Bell', notes: [880, 0, 880, 0, 880], tempo: 200 },
    { id: 2, name: '🎵 Gentle Chime', notes: [523, 659, 784, 1047], tempo: 300 },
    { id: 3, name: '⏰ Alarm Clock', notes: [800, 0, 800, 0, 800, 0, 800], tempo: 150 },
    { id: 4, name: '🎶 Melody Rise', notes: [440, 494, 523, 587, 659, 698, 784, 880], tempo: 180 },
    { id: 5, name: '📱 Digital Beep', notes: [1200, 0, 1200, 0, 1200, 0], tempo: 120 },
    { id: 6, name: '🌊 Soft Wave', notes: [330, 392, 440, 392, 330], tempo: 350 },
    { id: 7, name: '🎹 Piano Drop', notes: [784, 659, 523, 440, 330], tempo: 250 },
    { id: 8, name: '🚨 Urgent Alert', notes: [1000, 500, 1000, 500, 1000, 500], tempo: 100 },
    { id: 9, name: '🌟 Sparkle', notes: [1047, 0, 880, 0, 1047, 0, 880, 0, 1047], tempo: 130 },
    { id: 10, name: '🎺 Trumpet Call', notes: [523, 523, 523, 659, 784, 784], tempo: 220 },
];

export function getRingtones() {
    return RINGTONES;
}

export function getRingtoneById(id) {
    return RINGTONES.find((r) => r.id === id) || RINGTONES[0];
}

/** Play a ringtone by ID. Returns a stop function. */
export function playRingtone(ringtoneId, repeat = 2) {
    const ringtone = getRingtoneById(ringtoneId);
    if (!ringtone || !AudioContext) return () => { };

    const ctx = new AudioContext();
    let stopped = false;
    let timeoutIds = [];

    function playOnce(startDelay = 0) {
        ringtone.notes.forEach((freq, i) => {
            const time = startDelay + i * ringtone.tempo;
            const tid = setTimeout(() => {
                if (stopped) return;
                if (freq === 0) return; // silence

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + ringtone.tempo / 1000 * 0.9);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + ringtone.tempo / 1000 * 0.95);
            }, time);
            timeoutIds.push(tid);
        });
    }

    // Play the ringtone 'repeat' times
    const singleDuration = ringtone.notes.length * ringtone.tempo;
    for (let r = 0; r < repeat; r++) {
        playOnce(r * (singleDuration + 300));
    }

    // Auto-stop after playing
    const totalDuration = repeat * (singleDuration + 300) + 500;
    const stopTid = setTimeout(() => {
        if (!stopped) {
            stopped = true;
            ctx.close();
        }
    }, totalDuration);
    timeoutIds.push(stopTid);

    // Return stop function
    return () => {
        stopped = true;
        timeoutIds.forEach(clearTimeout);
        try { ctx.close(); } catch { }
    };
}

/** Preview a ringtone (play once) */
export function previewRingtone(ringtoneId) {
    return playRingtone(ringtoneId, 1);
}
