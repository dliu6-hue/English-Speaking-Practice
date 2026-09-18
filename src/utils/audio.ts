/**
 * Audio helpers for English Speaking Practice
 */

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatMinSec(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Convert audio blob to base64 string
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Speech synthesis wrapper for native pronunciation when no audio file is attached
export function speakText(
  text: string,
  rate = 1.0,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return () => {};
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = Math.max(0.5, Math.min(2.0, rate));
  utterance.pitch = 1.0;

  // Try to pick a natural English voice
  const voices = window.speechSynthesis.getVoices();
  const englishVoice =
    voices.find((v) => v.lang.startsWith('en-US') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))) ||
    voices.find((v) => v.lang.startsWith('en'));
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  if (onStart) utterance.onstart = onStart;
  utterance.onend = () => {
    onEnd?.();
  };
  utterance.onerror = (e) => {
    console.warn('Speech synthesis error:', e);
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
    onEnd?.();
  };
}

// Synthesize an audio tone / wav file for realistic wave rendering
export function createToneAudioBuffer(
  audioCtx: AudioContext,
  duration = 3,
  frequency = 440
): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    // Gentle modulated harmonic sound resembling speech pitch
    const envelope = Math.sin((Math.PI * i) / buffer.length);
    data[i] =
      Math.sin(2 * Math.PI * frequency * t) * 0.15 * envelope +
      Math.sin(2 * Math.PI * (frequency * 1.5) * t) * 0.05 * envelope;
  }

  return buffer;
}
