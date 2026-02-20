import { useState, useRef, useCallback } from 'react';
import { parseVoiceCommand } from '../utils/voiceParser';
import './VoiceButton.css';

const SpeechRecognition =
    typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

export default function VoiceButton({ onResult }) {
    const [listening, setListening] = useState(false);
    const [error, setError] = useState('');
    const recognitionRef = useRef(null);

    const supported = !!SpeechRecognition;

    const toggle = useCallback(async () => {
        if (!supported) return;

        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
            return;
        }

        setError('');

        // Explicitly request microphone permission first
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately — we just needed the permission
            stream.getTracks().forEach((t) => t.stop());
        } catch (err) {
            setError('Microphone blocked. Please allow mic access in Settings.');
            console.error('Mic permission denied:', err);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const parsed = parseVoiceCommand(transcript);
            onResult?.(parsed, transcript);
            setListening(false);
        };

        recognition.onerror = (e) => {
            console.error('Speech error:', e.error);
            if (e.error === 'not-allowed') {
                setError('Mic access denied. Check browser settings.');
            }
            setListening(false);
        };
        recognition.onend = () => setListening(false);

        recognitionRef.current = recognition;
        recognition.start();
        setListening(true);
    }, [listening, supported, onResult]);

    if (!supported) {
        return (
            <button className="voice-btn unsupported" disabled title="Speech recognition not supported in this browser">
                <span className="voice-icon">🎙️</span>
                <span className="voice-label">Not Supported</span>
            </button>
        );
    }

    return (
        <>
            <button
                className={`voice-btn ${listening ? 'listening' : ''}`}
                onClick={toggle}
                title={listening ? 'Listening… click to stop' : 'Click to speak your schedule'}
            >
                <span className="voice-icon">{listening ? '🔴' : '🎙️'}</span>
                <span className="voice-label">{listening ? 'Listening…' : 'Voice'}</span>
            </button>
            {error && <span style={{ color: 'var(--accent-rose)', fontSize: '0.7rem' }}>{error}</span>}
        </>
    );
}
