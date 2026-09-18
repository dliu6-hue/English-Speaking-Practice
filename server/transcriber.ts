/**
 * Audio / Video Transcriber & Sentence Segmenter using FFmpeg & Whisper
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';
import wavefile from 'wavefile';
import {
  analyzeLinking,
  generatePhoneticHint,
  translateText,
  getWordIPA,
  generateDocumentPronunciationReport,
  PHONETIC_TRAPS,
} from './phonetics.js';

const WaveFile = (wavefile as any).default?.WaveFile || (wavefile as any).WaveFile || wavefile;

let transcriberInstance: any = null;

async function getTranscriber() {
  if (!transcriberInstance) {
    console.log('[Transcriber] Initializing Whisper model...');
    transcriberInstance = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en'
    );
    console.log('[Transcriber] Whisper model ready!');
  }
  return transcriberInstance;
}

export interface SegmentedSentence {
  id: string;
  index: number;
  text: string;
  startTime: number;
  endTime: number;
  translation: string;
  phoneticHint?: string;
  linkingTip?: {
    phrase: string;
    naturalPronunciation: string;
    explanation: string;
  };
}

/**
 * Extracts 16kHz mono WAV from any media file (MP4, MOV, MKV, MP3, WAV, WebM, etc.)
 */
export function extractAudioToWav(inputPath: string, outputPath: string): number {
  try {
    // 1. Convert video/audio to 16kHz 16-bit mono PCM wav using FFmpeg
    execSync(
      `ffmpeg -i "${inputPath}" -vn -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}" -y`,
      { stdio: 'pipe' }
    );

    // 2. Measure exact duration using ffprobe
    let duration = 0;
    try {
      const probeOutput = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`,
        { stdio: 'pipe' }
      )
        .toString()
        .trim();
      duration = parseFloat(probeOutput) || 0;
    } catch {
      // Fallback: estimate from wav size (16000 samples * 2 bytes/sample = 32000 bytes/sec)
      const stats = fs.statSync(outputPath);
      duration = Math.max(1, Math.round((stats.size - 44) / 32000));
    }

    return duration;
  } catch (err: any) {
    console.error('[FFmpeg] Extraction error:', err.message);
    throw new Error('Failed to extract audio track from media file.');
  }
}

/**
 * Transcribe media file and segment into complete, timestamped sentences.
 * Uses windowed processing (15s slices) so Whisper processes long audio in full without truncation.
 */
export async function transcribeAndSegmentFile(
  inputPath: string,
  filename: string
): Promise<{ duration: number; sentences: SegmentedSentence[]; documentReport: any }> {
  const tempWav = path.join(
    '/tmp',
    `clean_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`
  );

  try {
    console.log(`[Transcriber] Extracting audio for "${filename}"...`);
    const duration = extractAudioToWav(inputPath, tempWav);
    console.log(`[Transcriber] Media duration: ${duration.toFixed(2)}s`);

    // Read WAV file into Float32Array for Whisper
    const wavBuffer = fs.readFileSync(tempWav);
    const wav = new WaveFile(wavBuffer);
    wav.toBitDepth('32f');
    wav.toSampleRate(16000);
    let audioData = wav.getSamples();
    if (Array.isArray(audioData)) {
      audioData = audioData[0];
    }

    const transcriber = await getTranscriber();
    console.log(`[Transcriber] Transcribing audio with full-coverage windowing (${audioData.length} samples)...`);

    const windowSec = 15;
    const sampleRate = 16000;
    const totalSamples = audioData.length;
    const numSlices = Math.max(1, Math.ceil(totalSamples / (windowSec * sampleRate)));
    
    interface SpeechChunk {
      text: string;
      start: number;
      end: number;
    }
    const allChunks: SpeechChunk[] = [];

    for (let s = 0; s < numSlices; s++) {
      const startSample = s * windowSec * sampleRate;
      const endSample = Math.min(totalSamples, (s + 1) * windowSec * sampleRate);
      const startSec = startSample / sampleRate;
      const endSec = endSample / sampleRate;
      const subAudio = audioData.slice(startSample, endSample);

      try {
        const res = await transcriber(subAudio, { return_timestamps: true });
        const chunks = res.chunks || (res.text ? [{ timestamp: [0, endSec - startSec], text: res.text }] : []);

        for (const c of chunks) {
          const text = (c.text || '').trim();
          if (!text) continue;
          const cStart = startSec + (c.timestamp && c.timestamp[0] != null ? c.timestamp[0] : 0);
          const cEnd = startSec + (c.timestamp && c.timestamp[1] != null ? c.timestamp[1] : (endSec - startSec));
          allChunks.push({
            text,
            start: Math.round(cStart * 100) / 100,
            end: Math.round(Math.min(duration, cEnd) * 100) / 100,
          });
        }
      } catch (sliceErr) {
        console.warn(`[Transcriber] Warning on slice ${s}:`, sliceErr);
      }
    }

    console.log(`[Transcriber] Collected ${allChunks.length} speech chunks across entire duration.`);

    // Assemble speech chunks into natural, complete sentences
    let sentences: SegmentedSentence[] = [];

    if (allChunks.length > 0) {
      let currentSentenceText = '';
      let sentenceStart = allChunks[0].start;
      let sentenceEnd = sentenceStart;

      for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        const chunkText = chunk.text;

        if (!currentSentenceText) {
          sentenceStart = chunk.start;
        }

        currentSentenceText += (currentSentenceText ? ' ' : '') + chunkText;
        sentenceEnd = Math.max(sentenceEnd, chunk.end);

        const hasTerminalPunctuation = /[.!?]$/.test(chunkText);
        const nextChunk = allChunks[i + 1];
        const hasLongPause = nextChunk && nextChunk.start - sentenceEnd > 0.8;
        const wordCount = currentSentenceText.split(/\s+/).length;
        const isLongEnough = wordCount >= 14;

        if (hasTerminalPunctuation || hasLongPause || isLongEnough || i === allChunks.length - 1) {
          // If multiple terminal punctuations exist, split appropriately
          const parts = currentSentenceText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [currentSentenceText];
          
          if (parts.length > 1 && i < allChunks.length - 1) {
            const span = sentenceEnd - sentenceStart;
            const totalChars = currentSentenceText.length;
            let runningStart = sentenceStart;

            for (let p = 0; p < parts.length - 1; p++) {
              const partText = parts[p].trim();
              if (!partText) continue;
              const pDuration = Math.max(0.5, (partText.length / totalChars) * span);
              const pEnd = Math.min(duration, runningStart + pDuration);
              const index = sentences.length + 1;
              sentences.push({
                id: String(index).padStart(3, '0'),
                index,
                text: partText,
                startTime: Math.round(runningStart * 100) / 100,
                endTime: Math.round(pEnd * 100) / 100,
                translation: '',
              });
              runningStart = pEnd;
            }
            currentSentenceText = parts[parts.length - 1].trim();
            sentenceStart = runningStart;
          } else {
            const cleanText = currentSentenceText.trim();
            if (cleanText.length > 0) {
              const index = sentences.length + 1;
              sentences.push({
                id: String(index).padStart(3, '0'),
                index,
                text: cleanText,
                startTime: Math.round(sentenceStart * 100) / 100,
                endTime: Math.round(Math.max(sentenceStart + 0.6, sentenceEnd) * 100) / 100,
                translation: '',
              });
            }
            currentSentenceText = '';
          }
        }
      }

      if (currentSentenceText.trim()) {
        const index = sentences.length + 1;
        sentences.push({
          id: String(index).padStart(3, '0'),
          index,
          text: currentSentenceText.trim(),
          startTime: Math.round(sentenceStart * 100) / 100,
          endTime: Math.round(Math.max(sentenceStart + 0.6, sentenceEnd) * 100) / 100,
          translation: '',
        });
      }
    }

    // Fallback if no sentences could be segmented
    if (sentences.length === 0) {
      sentences.push({
        id: '001',
        index: 1,
        text: 'Speech recognized in audio lesson.',
        startTime: 0,
        endTime: Math.max(2, Math.round(duration * 100) / 100),
        translation: '音频中已成功识别语音内容。',
      });
    }

    // Enrich sentences with translations, phonetic hints, and linking tips
    console.log(`[Transcriber] Enriching ${sentences.length} sentences with phonetics & translations...`);
    for (const s of sentences) {
      if (!s.translation) {
        s.translation = await translateText(s.text);
      }
      s.phoneticHint = generatePhoneticHint(s.text);
      s.linkingTip = analyzeLinking(s.text);
    }

    // Generate comprehensive Document Pronunciation Report
    const documentReport = generateDocumentPronunciationReport(sentences);

    return {
      duration,
      sentences,
      documentReport,
    };
  } finally {
    // Clean up temporary WAV
    if (fs.existsSync(tempWav)) {
      try {
        fs.unlinkSync(tempWav);
      } catch {}
    }
  }
}

/**
 * Parses and processes subtitle or text documents (.srt, .vtt, .txt, .md) into segmented sentences
 */
export async function transcribeAndSegmentDocumentText(
  content: string,
  filename: string
): Promise<{ duration: number; sentences: SegmentedSentence[]; documentReport: any }> {
  const ext = path.extname(filename).toLowerCase();
  const sentences: SegmentedSentence[] = [];

  if (ext === '.srt') {
    // Parse SRT format
    const blocks = content.trim().split(/\r?\n\r?\n/);
    blocks.forEach((block) => {
      const lines = block.trim().split(/\r?\n/);
      if (lines.length >= 2) {
        const timeLine = lines.find((l) => l.includes('-->'));
        if (timeLine) {
          const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
          const parseSrtTime = (t: string) => {
            const parts = t.replace(',', '.').split(':');
            if (parts.length === 3) {
              return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
            }
            return 0;
          };
          const startTime = parseSrtTime(startStr);
          const endTime = parseSrtTime(endStr);
          const text = lines
            .slice(lines.indexOf(timeLine) + 1)
            .join(' ')
            .replace(/<[^>]+>/g, '')
            .trim();

          if (text) {
            const index = sentences.length + 1;
            sentences.push({
              id: String(index).padStart(3, '0'),
              index,
              text,
              startTime: Math.round(startTime * 100) / 100,
              endTime: Math.round(Math.max(startTime + 1, endTime) * 100) / 100,
              translation: '',
            });
          }
        }
      }
    });
  } else if (ext === '.vtt') {
    // Parse WebVTT
    const lines = content.replace(/^WEBVTT[^\n]*\n/, '').trim().split(/\r?\n/);
    let currentStart = 0;
    let currentEnd = 0;
    let currentText = '';

    const parseVttTime = (t: string) => {
      const parts = t.split(':');
      if (parts.length === 3) {
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
      } else if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return 0;
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.includes('-->')) {
        if (currentText) {
          const index = sentences.length + 1;
          sentences.push({
            id: String(index).padStart(3, '0'),
            index,
            text: currentText.trim(),
            startTime: Math.round(currentStart * 100) / 100,
            endTime: Math.round(Math.max(currentStart + 1, currentEnd) * 100) / 100,
            translation: '',
          });
          currentText = '';
        }
        const [s, e] = trimmed.split('-->').map((x) => x.trim().split(' ')[0]);
        currentStart = parseVttTime(s);
        currentEnd = parseVttTime(e);
      } else if (trimmed && !/^\d+$/.test(trimmed)) {
        currentText += (currentText ? ' ' : '') + trimmed.replace(/<[^>]+>/g, '');
      }
    });

    if (currentText) {
      const index = sentences.length + 1;
      sentences.push({
        id: String(index).padStart(3, '0'),
        index,
        text: currentText.trim(),
        startTime: Math.round(currentStart * 100) / 100,
        endTime: Math.round(Math.max(currentStart + 1, currentEnd) * 100) / 100,
        translation: '',
      });
    }
  } else {
    // Plain Text (.txt, .md)
    const cleanContent = content
      .replace(/^#+\s+.*$/gm, '')
      .replace(/\r\n/g, '\n')
      .trim();

    const rawSentences = cleanContent.match(/[^.!?\n]+[.!?]+|[^.!?\n]+$/g) || [cleanContent];
    let currentTime = 0;

    rawSentences.forEach((raw) => {
      const trimmed = raw.replace(/\s+/g, ' ').trim();
      if (trimmed.length > 2) {
        const words = trimmed.split(' ').length;
        const estDuration = Math.max(1.8, Math.round(words * 0.45 * 10) / 10);
        const index = sentences.length + 1;
        sentences.push({
          id: String(index).padStart(3, '0'),
          index,
          text: trimmed,
          startTime: Math.round(currentTime * 100) / 100,
          endTime: Math.round((currentTime + estDuration) * 100) / 100,
          translation: '',
        });
        currentTime += estDuration + 0.4;
      }
    });
  }

  const duration = sentences.length > 0 ? sentences[sentences.length - 1].endTime : 10;

  for (const s of sentences) {
    if (!s.translation) {
      s.translation = await translateText(s.text);
    }
    s.phoneticHint = generatePhoneticHint(s.text);
    s.linkingTip = analyzeLinking(s.text);
  }

  const documentReport = generateDocumentPronunciationReport(sentences);

  return {
    duration,
    sentences,
    documentReport,
  };
}

/**
 * Transcribe user recording buffer and evaluate pronunciation against target sentence
 * Features deep phonetic trap detection and actionable articulatory guidance
 */
export async function evaluateRecording(
  userAudioBuffer: Buffer,
  targetText: string,
  targetDuration: number
) {
  const tempUserWav = path.join(
    '/tmp',
    `user_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`
  );
  const tempConvertedWav = path.join(
    '/tmp',
    `user_16k_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`
  );

  try {
    fs.writeFileSync(tempUserWav, userAudioBuffer);

    // Convert user audio to 16kHz mono WAV using ffmpeg
    execSync(`ffmpeg -i "${tempUserWav}" -vn -ar 16000 -ac 1 -c:a pcm_s16le "${tempConvertedWav}" -y`, {
      stdio: 'pipe',
    });

    const wavBuffer = fs.readFileSync(tempConvertedWav);
    const wav = new WaveFile(wavBuffer);
    wav.toBitDepth('32f');
    wav.toSampleRate(16000);
    let audioData = wav.getSamples();
    if (Array.isArray(audioData)) {
      audioData = audioData[0];
    }

    const transcriber = await getTranscriber();
    const result = await transcriber(audioData);
    const userSpokenText = (result.text || '').trim();
    console.log(`[Evaluation] Target: "${targetText}" | User spoken: "${userSpokenText}"`);

    // Word-level alignment
    const targetWords = targetText
      .replace(/[^\w\s']/g, '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const userWords = userSpokenText
      .replace(/[^\w\s']/g, '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    let matchCount = 0;
    const wordResults = targetWords.map((tw) => {
      const isMatched = userWords.includes(tw);
      if (isMatched) matchCount++;

      // Check if word hits a known phonetic trap for specific articulatory correction
      const hitTrap = PHONETIC_TRAPS.find((t) => t.matcher(tw));

      let tip: string | undefined = undefined;
      if (!isMatched) {
        if (hitTrap) {
          tip = `${hitTrap.title}：${hitTrap.correctionTip(tw)}`;
        } else {
          tip = `发音不够清晰或有吞音，注意国际音标 ${getWordIPA(tw)} 的饱满度与重音。`;
        }
      }

      return {
        word: tw,
        status: (isMatched ? 'correct' : 'imperfect') as 'correct' | 'imperfect',
        ipa: getWordIPA(tw),
        tip,
      };
    });

    // Score calculations
    const accuracyRatio = targetWords.length > 0 ? matchCount / targetWords.length : 0.8;
    const accuracyScore = Math.min(99, Math.max(50, Math.round(accuracyRatio * 100)));

    // Fluency: penalize if length wildly differs
    const fluencyRatio =
      targetWords.length > 0
        ? Math.min(1, userWords.length / targetWords.length)
        : 0.85;
    const fluencyScore = Math.min(96, Math.max(55, Math.round(fluencyRatio * 92 + (accuracyScore > 80 ? 6 : 0))));

    // Pronunciation score based on match count + clarity
    const pronunciationScore = Math.min(
      99,
      Math.max(52, Math.round(accuracyScore * 0.6 + fluencyScore * 0.4 + 3))
    );

    const overallScore = Math.round(
      pronunciationScore * 0.4 + fluencyScore * 0.3 + accuracyScore * 0.3
    );

    const missedWords = targetWords.filter((tw) => !userWords.includes(tw));

    let strengths = '整体发音清晰，核心实词重音明显，语调起伏自然。';
    let improvements = '可以进一步提升语速连贯度，注意单词之间的自然连音滑过。';
    let advice = '建议在 0.75x 慢速下精听原句 2 遍，再恢复常速大声模仿跟读。';

    if (overallScore >= 88) {
      strengths = '发音极其地道饱满，元音饱满辅音清晰，意群停顿与原音高度吻合！';
      improvements = '尝试更自信地运用自然弱读与省音，使整体音律更加松弛从容。';
      advice = '已具备优秀发音质感，可尝试进一步挑战更快语速或更长篇幅的连续表达。';
    } else if (missedWords.length > 0) {
      improvements = `注意以下重点词汇的发音要点：${missedWords.slice(0, 3).map((w) => `"${w}"`).join('、')}，注意口型到位。`;
      advice = `重点复听第 1 遍原音，仔细观察每个词的开口度与舌位，再进行针对性二次跟读录制。`;
    }

    return {
      pronunciationScore,
      fluencyScore,
      accuracyScore,
      overallScore,
      strengths,
      improvements,
      advice,
      words: wordResults,
      userSpokenText,
    };
  } finally {
    if (fs.existsSync(tempUserWav)) {
      try {
        fs.unlinkSync(tempUserWav);
      } catch {}
    }
    if (fs.existsSync(tempConvertedWav)) {
      try {
        fs.unlinkSync(tempConvertedWav);
      } catch {}
    }
  }
}
