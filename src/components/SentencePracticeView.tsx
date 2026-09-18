import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Mic,
  Square,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Layers,
  Sparkle,
  HelpCircle,
} from 'lucide-react';
import { SentenceItem, AudioLesson, PracticeRecord, AIFeedback } from '../types';
import { speakText, blobToBase64, formatTime } from '../utils/audio';

interface SentencePracticeViewProps {
  lesson: AudioLesson;
  sentence: SentenceItem;
  practiceRecord?: PracticeRecord;
  onSaveRecord: (record: PracticeRecord) => void;
  onNavigateSentence: (newSentence: SentenceItem) => void;
  onBackToList: () => void;
}

export const SentencePracticeView: React.FC<SentencePracticeViewProps> = ({
  lesson,
  sentence,
  practiceRecord,
  onSaveRecord,
  onNavigateSentence,
  onBackToList,
}) => {
  // Speed options matching PRD 9: 0.5x, 0.75x, 1.0x, 1.25x, 1.5x
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5];
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(
    practiceRecord?.audioBlobUrl || null
  );
  const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(
    practiceRecord?.feedback || null
  );
  const [selectedWordTip, setSelectedWordTip] = useState<{ word: string; tip?: string; ipa?: string } | null>(null);
  const [showChinese, setShowChinese] = useState(true);

  // Audio References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);
  const userAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const originalMediaRef = useRef<HTMLMediaElement | null>(null);

  // When switching sentence, reset or load current practice record
  useEffect(() => {
    // Stop any ongoing playback or recording
    if (cancelSpeechRef.current) cancelSpeechRef.current();
    if (originalMediaRef.current) originalMediaRef.current.pause();
    if (isRecording) stopRecording();

    setIsPlayingOriginal(false);
    setIsPlayingUserAudio(false);
    setSelectedWordTip(null);

    const existingRecord = lesson.practiceRecords[sentence.id];
    if (existingRecord) {
      setUserAudioUrl(existingRecord.audioBlobUrl || null);
      setFeedback(existingRecord.feedback);
    } else {
      setUserAudioUrl(null);
      setUserAudioBlob(null);
      setFeedback(null);
    }
  }, [sentence.id]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (cancelSpeechRef.current) cancelSpeechRef.current();
      if (originalMediaRef.current) originalMediaRef.current.pause();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Play Original Audio Slice or Synthetic Speech
  const handlePlayOriginal = () => {
    if (isPlayingOriginal) {
      if (originalMediaRef.current) originalMediaRef.current.pause();
      if (cancelSpeechRef.current) cancelSpeechRef.current();
      setIsPlayingOriginal(false);
      return;
    }

    // If lesson has an uploaded audio or video file
    if (lesson.audioUrl && originalMediaRef.current) {
      const media = originalMediaRef.current;
      media.currentTime = sentence.startTime;
      media.playbackRate = playbackSpeed;

      media.play().then(() => {
        setIsPlayingOriginal(true);
        const checkTime = () => {
          if (media.currentTime >= sentence.endTime) {
            media.pause();
            media.removeEventListener('timeupdate', checkTime);
            setIsPlayingOriginal(false);
          }
        };
        media.addEventListener('timeupdate', checkTime);
        media.onended = () => setIsPlayingOriginal(false);
      }).catch((err) => {
        console.warn('Media play error, falling back to speech:', err);
        playNativeSpeech();
      });
    } else {
      playNativeSpeech();
    }
  };

  const playNativeSpeech = () => {
    setIsPlayingOriginal(true);
    cancelSpeechRef.current = speakText(
      sentence.text,
      playbackSpeed,
      () => setIsPlayingOriginal(true),
      () => setIsPlayingOriginal(false)
    );
  };

  // Start Recording
  const startRecording = async () => {
    try {
      if (cancelSpeechRef.current) cancelSpeechRef.current();
      setIsPlayingOriginal(false);
      setIsPlayingUserAudio(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // AudioContext for visual frequency meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(audioBlob);
        setUserAudioBlob(audioBlob);
        setUserAudioUrl(url);

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setAudioLevel(0);

        // Auto trigger AI evaluation
        analyzeRecording(audioBlob, recordingSeconds);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      alert('请允许麦克风权限以进行跟读录音测评。');
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Analyze Recording with AI
  const analyzeRecording = async (blob: Blob, durationSec: number) => {
    setIsAnalyzing(true);
    try {
      const base64 = await blobToBase64(blob);

      const res = await fetch('/api/analyze-pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: sentence.text,
          userAudioBase64: base64,
          mimeType: blob.type || 'audio/webm',
          duration: durationSec || 3,
          sentenceId: sentence.id,
        }),
      });

      if (!res.ok) throw new Error('Analysis request failed');
      const data = await res.json();
      const fb: AIFeedback = data.feedback;
      setFeedback(fb);

      // Save practice record
      const newRecord: PracticeRecord = {
        sentenceId: sentence.id,
        audioBlobUrl: URL.createObjectURL(blob),
        audioBase64: base64,
        mimeType: blob.type,
        recordedAt: Date.now(),
        duration: durationSec,
        feedback: fb,
      };
      onSaveRecord(newRecord);
    } catch (err: any) {
      console.error('Failed to analyze recording:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle user recording playback
  const togglePlayUserAudio = () => {
    if (!userAudioUrl) return;
    if (isPlayingUserAudio && userAudioPlayerRef.current) {
      userAudioPlayerRef.current.pause();
      setIsPlayingUserAudio(false);
    } else {
      if (userAudioPlayerRef.current) {
        userAudioPlayerRef.current.currentTime = 0;
        userAudioPlayerRef.current.play().then(() => setIsPlayingUserAudio(true)).catch(console.warn);
      }
    }
  };

  // A/B Compare: Play original, then immediately play user recording
  const playComparisonAB = () => {
    if (!userAudioUrl) return;
    // Play original first
    handlePlayOriginal();
  };

  // Sentence Navigation
  const currentIndex = lesson.sentences.findIndex((s) => s.id === sentence.id);
  const prevSentence = currentIndex > 0 ? lesson.sentences[currentIndex - 1] : null;
  const nextSentence =
    currentIndex < lesson.sentences.length - 1
      ? lesson.sentences[currentIndex + 1]
      : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Back & Pagination Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          id="btn-back-to-list"
          onClick={onBackToList}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-stone-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回句子列表</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-stone-100 text-stone-700">
            {currentIndex + 1} / {lesson.sentences.length}
          </span>
        </div>
      </div>

      {/* Media Player for Original Video / Audio */}
      {lesson.audioUrl && (
        lesson.isVideo ? (
          <div className="mb-6 rounded-2xl overflow-hidden bg-black shadow-sm">
            <video
              ref={originalMediaRef as any}
              src={lesson.audioUrl}
              className="w-full max-h-72 object-contain"
              playsInline
            />
          </div>
        ) : (
          <audio
            ref={originalMediaRef as any}
            src={lesson.audioUrl}
            className="hidden"
          />
        )
      )}

      {/* Main Practice Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 mb-6">
        {/* Sentence Number Header matching PRD 8 */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-amber-800 text-xs font-semibold uppercase tracking-wider">
            <span>Sentence {String(sentence.index || currentIndex + 1).padStart(2, '0')}</span>
          </div>

          <button
            onClick={() => setShowChinese(!showChinese)}
            className="text-xs text-stone-600 hover:text-stone-900 transition-colors underline decoration-dotted"
          >
            {showChinese ? '隐藏中文翻译' : '显示中文翻译'}
          </button>
        </div>

        {/* English Text matching PRD 8 */}
        <div className="text-center my-6 sm:my-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight leading-relaxed select-text">
            {sentence.text}
          </h2>

          {showChinese && sentence.translation && (
            <p className="mt-3 text-sm sm:text-base text-stone-600 font-medium">
              {sentence.translation}
            </p>
          )}

          {sentence.phoneticHint && (
            <div className="mt-2 text-xs text-stone-600 font-mono">
              💡 {sentence.phoneticHint}
            </div>
          )}
        </div>

        {/* 11.4 连读与自然弱读提示卡片 (PRD 11.4 Connected Speech) */}
        {sentence.linkingTip && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>自然口语连读提示 (Connected Speech)</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-xs font-semibold text-stone-800 bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                {sentence.linkingTip.phrase}
              </span>
              <span className="text-xs font-bold text-amber-700">↓ 连读弱化</span>
              <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {sentence.linkingTip.naturalPronunciation}
              </span>
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              {sentence.linkingTip.explanation}
            </p>
            <p className="text-[11px] text-amber-800/70 mt-1 italic">
              *提示：这是真实母语者自然口语中的连音现象，不是正式书写拼写。
            </p>
          </div>
        )}

        {/* SECTION 9: 原音播放 (Play Original & Speed Control) */}
        <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            id="btn-play-original"
            onClick={handlePlayOriginal}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-xs active:scale-98 ${
              isPlayingOriginal
                ? 'bg-amber-600 text-white'
                : 'bg-stone-900 hover:bg-stone-800 text-white'
            }`}
          >
            {isPlayingOriginal ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Original</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play Original 播放原音</span>
              </>
            )}
          </button>

          {/* Speed selector matching PRD 9: 0.5x, 0.75x, 1.0x, 1.25x, 1.5x */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
            <Volume2 className="w-3.5 h-3.5 text-stone-600 ml-1.5 mr-0.5" />
            {speedOptions.map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg transition-all ${
                  playbackSpeed === speed
                    ? 'bg-white text-stone-950 shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 10: 跟读录音 (Your Recording) matching PRD 10 */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 mb-6 text-center">
        <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-4">
          Your Recording 跟读录音
        </h3>

        {isRecording ? (
          /* Live Recording State matching PRD */
          <div className="py-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold mb-3 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              <span>🔴 Recording...</span>
            </div>

            {/* Timer 00:03 matching PRD */}
            <div className="text-3xl font-mono font-bold text-stone-900 mb-4 tracking-tight">
              {formatTime(recordingSeconds)}
            </div>

            {/* Audio frequency visualizer bars */}
            <div className="flex items-center justify-center gap-1 h-10 mb-6">
              {[12, 28, 45, 70, 95, 80, 60, 40, 25, 65, 85, 30].map((h, i) => {
                const dynamicHeight = Math.max(6, Math.round((h * (audioLevel + 20)) / 100));
                return (
                  <div
                    key={i}
                    className="w-1.5 bg-rose-500 rounded-full transition-all duration-75"
                    style={{ height: `${dynamicHeight}px` }}
                  />
                );
              })}
            </div>

            <button
              id="btn-stop-recording"
              onClick={stopRecording}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>[ Stop 停止录音并分析 ]</span>
            </button>
          </div>
        ) : (
          /* Idle / Recorded State */
          <div>
            {!userAudioUrl ? (
              <div>
                <button
                  id="btn-start-recording"
                  onClick={startRecording}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base shadow-sm transition-all active:scale-98"
                >
                  <Mic className="w-5 h-5 text-stone-950" />
                  <span>Start Recording 开始跟读录音</span>
                </button>
                <p className="text-xs text-stone-600 mt-3">
                  点击按钮大声朗读，录音结束后 AI 将自动进行多维度发音诊断
                </p>
              </div>
            ) : (
              <div>
                {/* User Audio Player & Compare Controls */}
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/70 mb-4 max-w-md mx-auto">
                  <audio
                    ref={userAudioPlayerRef}
                    src={userAudioUrl}
                    onEnded={() => setIsPlayingUserAudio(false)}
                    className="hidden"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        id="btn-play-user-recording"
                        onClick={togglePlayUserAudio}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-xs ${
                          isPlayingUserAudio
                            ? 'bg-amber-500 text-white'
                            : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-200'
                        }`}
                      >
                        {isPlayingUserAudio ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>
                      <div className="text-left">
                        <div className="text-xs font-semibold text-stone-800">
                          你的录音回放
                        </div>
                        <div className="text-[11px] text-stone-600 font-mono">
                          User Recording · {practiceRecord?.duration || 3}s
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePlayOriginal}
                        title="再次对比原音"
                        className="p-2 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-medium inline-flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">听原音对比</span>
                      </button>

                      <button
                        id="btn-rerecord"
                        onClick={startRecording}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-medium transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>重新录音</span>
                      </button>
                    </div>
                  </div>
                </div>

                {isAnalyzing && (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-amber-700 animate-pulse">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                    <span>AI 正在评估发音、连读、语速与流利度...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 11 & 12: AI Feedback 诊断与评分 matching PRD 11 & 12 */}
      {feedback && !isRecording && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 mb-8 text-left">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-stone-900 text-base">
                AI Feedback 口语分析报告
              </h3>
            </div>

            {/* Overall Score Badge matching PRD */}
            <div className="text-right">
              <div className="text-[11px] text-stone-600 font-medium">综合评分</div>
              <div className="text-2xl font-bold font-mono text-emerald-600">
                {feedback.overallScore}
                <span className="text-xs font-normal text-stone-600 ml-0.5">/ 100</span>
              </div>
            </div>
          </div>

          {/* Scores Breakdown Grid matching PRD 8 & 12 */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="bg-stone-50 rounded-xl p-3 sm:p-4 border border-stone-200/60 text-center">
              <div className="text-xs text-stone-600 font-medium mb-1">
                发音 Pronunciation
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900">
                {feedback.pronunciationScore}
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${feedback.pronunciationScore}%` }}
                />
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-3 sm:p-4 border border-stone-200/60 text-center">
              <div className="text-xs text-stone-600 font-medium mb-1">
                流利度 Fluency
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900">
                {feedback.fluencyScore}
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${feedback.fluencyScore}%` }}
                />
              </div>
            </div>

            <div className="bg-stone-50 rounded-xl p-3 sm:p-4 border border-stone-200/60 text-center">
              <div className="text-xs text-stone-600 font-medium mb-1">
                语音准确度 Accuracy
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900">
                {feedback.accuracyScore}
              </div>
              <div className="w-full bg-stone-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{ width: `${feedback.accuracyScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Word-by-word Breakdown */}
          {feedback.words && feedback.words.length > 0 && (
            <div className="mb-6 bg-stone-50/70 p-4 rounded-xl border border-stone-200/70">
              <div className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>单词发音分析 (点击单词查看音标与改进技巧)</span>
                <span className="text-[11px] text-stone-600 font-normal">
                  🟢 良好 · 🟡 需注意
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {feedback.words.map((w, idx) => {
                  const isGood = w.status === 'correct';
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedWordTip(w)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        isGood
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      <span>{w.word}</span>
                      {w.ipa && <span className="font-mono text-[10px] ml-1 opacity-75">{w.ipa}</span>}
                    </button>
                  );
                })}
              </div>

              {selectedWordTip && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-stone-200 text-xs">
                  <div className="font-semibold text-stone-900 mb-0.5">
                    单词详情：<span className="text-amber-700">{selectedWordTip.word}</span>
                    {selectedWordTip.ipa && (
                      <span className="font-mono text-stone-600 ml-1.5">{selectedWordTip.ipa}</span>
                    )}
                  </div>
                  <p className="text-stone-600">
                    {selectedWordTip.tip || '发音饱满清晰，音调与重音自然符合标准。'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Structured Feedback Sections matching PRD 12 */}
          <div className="space-y-3 text-xs sm:text-sm">
            {/* 做得好的地方 */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="font-semibold text-emerald-900 flex items-center gap-1.5 mb-1">
                <span>👍 做得好的地方</span>
              </div>
              <p className="text-emerald-800 leading-relaxed">
                {feedback.strengths}
              </p>
            </div>

            {/* 可以改进 */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
              <div className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1">
                <span>🔧 可以改进</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                {feedback.improvements}
              </p>
            </div>

            {/* 练习建议 */}
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
              <div className="font-semibold text-indigo-900 flex items-center gap-1.5 mb-1">
                <span>🗣️ 建议 (Actionable Advice)</span>
              </div>
              <p className="text-indigo-800 leading-relaxed">
                {feedback.advice}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: Navigation Footer matching PRD 8 (← Previous Next →) */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-stone-200">
        <button
          id="btn-prev-sentence"
          onClick={() => prevSentence && onNavigateSentence(prevSentence)}
          disabled={!prevSentence}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            prevSentence
              ? 'bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 shadow-2xs'
              : 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-600'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Previous 上一句</span>
        </button>

        <button
          id="btn-next-sentence"
          onClick={() => nextSentence && onNavigateSentence(nextSentence)}
          disabled={!nextSentence}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            nextSentence
              ? 'bg-stone-900 hover:bg-stone-800 text-white shadow-2xs'
              : 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-600'
          }`}
        >
          <span>下一句 Next →</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
