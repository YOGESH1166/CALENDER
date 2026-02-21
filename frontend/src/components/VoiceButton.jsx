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

    const toggle = useCallback(() => {
        if (!supported) return;

        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
            return;
        }

        setError('');

        try {
            const recognition = new SpeechRecognition();
            let fullTranscript = '';

            recognition.lang = 'en-US';
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            recognition.continuous = true;

            recognition.onresult = (event) => {
                let currentInterim = '';
                let currentFinal = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        currentFinal += event.results[i][0].transcript + ' ';
                    } else {
                        currentInterim += event.results[i][0].transcript;
                    }
                }

                fullTranscript += currentFinal;
                const totalTranscript = (fullTranscript + currentInterim).trim();

                const parsed = parseVoiceCommand(totalTranscript);
                onResult?.(parsed, totalTranscript);
                setError('');
            };

            recognition.onerror = (e) => {
                console.error('Speech error:', e.error);
                setListening(false);
                if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                    setError('Open this page in Chrome browser (not installed app) to use voice.');
                } else if (e.error === 'no-speech') {
                    setError('No speech heard. Tap Voice and speak.');
                } else if (e.error === 'network') {
                    setError('Needs internet for voice.');
                } else {
                    setError(`Error: ${e.error}`);
                }
            };

            recognition.onend = () => setListening(false);

            recognitionRef.current = recognition;
            recognition.start();
            setListening(true);
        } catch (err) {
            setError('Open this page in Chrome browser to use voice.');
            console.error('SpeechRecognition failed:', err);
        }
    }, [listening, supported, onResult]);

    if (!supported) {
        return (
            <button className="voice-btn unsupported" disabled>
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
            >
                <span className="voice-icon">{listening ? '🔴' : '🎙️'}</span>
                <span className="voice-label">{listening ? 'Listening…' : 'Voice'}</span>
            </button>
            {error && (
                <span
                    style={{ color: 'var(--accent-rose)', fontSize: '0.65rem', lineHeight: 1.3, cursor: 'pointer' }}
                    onClick={() => setError('')}
                >
                    {error} <small>(tap to dismiss)</small>
                </span>
            )}
        </>
    );
}
