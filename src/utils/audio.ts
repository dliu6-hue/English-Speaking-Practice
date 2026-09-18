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

/**
 * Decodes any audio/video file supported by the browser (mp3, wav, m4a, aac, mp4, mov, webm, etc.)
 * into a clean 16kHz 16-bit mono PCM WAV Blob using hardware-accelerated Web Audio API.
 */
export async function decodeAudioTo16kWavBlob(
  fileOrBlob: File | Blob
): Promise<{ wavBlob: Blob; duration: number } | null> {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const audioCtx = new AudioContextClass();
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const duration = decodedBuffer.duration;

    if (!duration || duration <= 0) {
      await audioCtx.close().catch(() => {});
      return null;
    }

    const targetSampleRate = 16000;
    const targetLength = Math.max(1, Math.ceil(duration * targetSampleRate));

    // Resample to 16kHz mono using OfflineAudioContext
    const OfflineCtxClass =
      window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!OfflineCtxClass) {
      await audioCtx.close().catch(() => {});
      return null;
    }

    const offlineCtx = new OfflineCtxClass(1, targetLength, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    await audioCtx.close().catch(() => {});

    // Convert Float32Array to 16-bit mono WAV Blob
    const channelData = renderedBuffer.getChannelData(0);
    const wavBlob = encodeWavBlob(channelData, targetSampleRate);
    return { wavBlob, duration };
  } catch (err) {
    console.warn('[AudioDecoder] Client-side decoding skipped or failed:', err);
    return null;
  }
}

/**
 * Encodes Float32Array audio samples into a standard 16-bit mono WAV Blob with 44-byte header
 */
export function encodeWavBlob(samples: Float32Array, sampleRate = 16000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataByteLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  // RIFF identifier
  writeAsciiString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + dataByteLength, true);
  // RIFF type
  writeAsciiString(view, 8, 'WAVE');
  // format chunk identifier
  writeAsciiString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM = 1)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate
  view.setUint32(28, byteRate, true);
  // block align
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitsPerSample, true);
  // data chunk identifier
  writeAsciiString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataByteLength, true);

  // Write 16-bit PCM samples with clipping
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAsciiString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
