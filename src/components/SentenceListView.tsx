import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  ArrowLeft,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronRight,
  Headphones,
  CheckCircle,
  FileText,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { AudioLesson, SentenceItem } from '../types';
import { formatMinSec, speakText } from '../utils/audio';
import { generateClientDocumentReport } from '../utils/phoneticReport';
import { DocumentPronunciationReportView } from './DocumentPronunciationReportView';

interface SentenceListViewProps {
  lesson: AudioLesson;
  onSelectSentence: (sentence: SentenceItem) => void;
  onBack: () => void;
}

export const SentenceListView: React.FC<SentenceListViewProps> = ({
  lesson,
  onSelectSentence,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'sentences' | 'report'>('sentences');
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(lesson.duration || 15);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [playingSentenceId, setPlayingSentenceId] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(lesson.isVideo || false);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);

  // Ensure document report is present
  const report = useMemo(() => {
    if (lesson.documentReport) return lesson.documentReport;
    return generateClientDocumentReport(lesson.sentences);
  }, [lesson.documentReport, lesson.sentences]);

  // Initialize or update duration when lesson changes
  useEffect(() => {
    setDuration(lesson.duration || 15);
    setCurrentTime(0);
    setIsPlayingFull(false);
    setPlayingSentenceId(null);
    if (lesson.isVideo) {
      setShowVideo(true);
    }
  }, [lesson.id, lesson.duration, lesson.isVideo]);

  // Update playback speed
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Handle Full Audio Play / Pause
  const togglePlayFull = () => {
    if (lesson.audioUrl && mediaRef.current) {
      if (isPlayingFull) {
        mediaRef.current.pause();
        setIsPlayingFull(false);
      } else {
        if (cancelSpeechRef.current) cancelSpeechRef.current();
        setPlayingSentenceId(null);
        mediaRef.current.play().then(() => setIsPlayingFull(true)).catch((e) => console.warn(e));
      }
    } else {
      // For preset audios without custom file, play all sentences sequentially via speech
      if (isPlayingFull) {
        if (cancelSpeechRef.current) cancelSpeechRef.current();
        setIsPlayingFull(false);
      } else {
        setIsPlayingFull(true);
        const allText = lesson.sentences.map((s) => s.text).join(' ');
        cancelSpeechRef.current = speakText(
          allText,
          playbackSpeed,
          () => setIsPlayingFull(true),
          () => setIsPlayingFull(false)
        );
      }
    }
  };

  // Play a single sentence segment
  const playSentenceSegment = (e: React.MouseEvent, sentence: SentenceItem) => {
    e.stopPropagation();

    if (lesson.audioUrl && mediaRef.current) {
      const media = mediaRef.current;
      media.currentTime = sentence.startTime;
      media.playbackRate = playbackSpeed;
      media.play().then(() => {
        setIsPlayingFull(false);
        setPlayingSentenceId(sentence.id);

        const checkEnd = () => {
          if (media.currentTime >= sentence.endTime) {
            media.pause();
            media.removeEventListener('timeupdate', checkEnd);
            setPlayingSentenceId(null);
          }
        };
        media.addEventListener('timeupdate', checkEnd);
      }).catch(console.warn);
    } else {
      // Speech synthesis fallback
      if (cancelSpeechRef.current) cancelSpeechRef.current();
      setPlayingSentenceId(sentence.id);
      cancelSpeechRef.current = speakText(
        sentence.text,
        playbackSpeed,
        () => setPlayingSentenceId(sentence.id),
        () => setPlayingSentenceId(null)
      );
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
      if (mediaRef.current.duration && !isNaN(mediaRef.current.duration) && isFinite(mediaRef.current.duration)) {
        setDuration(mediaRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
    }
  };

  const speedOptions = [0.8, 1.0, 1.2];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Hidden or visible media element */}
      {lesson.audioUrl && (
        lesson.isVideo ? (
          <video
            ref={mediaRef as any}
            src={lesson.audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => {
              const d = (e.target as HTMLVideoElement).duration;
              if (d && !isNaN(d) && isFinite(d) && d > 0) setDuration(d);
            }}
            onEnded={() => {
              setIsPlayingFull(false);
              setPlayingSentenceId(null);
            }}
            muted={isMuted}
            playsInline
            className={showVideo ? 'w-full max-h-80 bg-black rounded-2xl mb-6 object-contain shadow-md' : 'hidden'}
          />
        ) : (
          <audio
            ref={mediaRef as any}
            src={lesson.audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => {
              const d = (e.target as HTMLAudioElement).duration;
              if (d && !isNaN(d) && isFinite(d) && d > 0) setDuration(d);
            }}
            onEnded={() => {
              setIsPlayingFull(false);
              setPlayingSentenceId(null);
            }}
            muted={isMuted}
          />
        )
      )}

      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          id="btn-back-to-home"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-stone-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>返回更换音频</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
            {lesson.tag || 'Audio Material'}
          </span>
          <span className="text-xs text-stone-600">
            共 {lesson.sentences.length} 句
          </span>
        </div>
      </div>

      {/* Lesson Heading */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mb-1">
          {lesson.title}
        </h1>
        <p className="text-xs sm:text-sm text-stone-600">
          {lesson.description || '已自动完成语音识别与分句切割，选择任意句子开始跟读训练。'}
        </p>
      </div>

      {/* Original Audio Player Bar matching Section 7 */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 sm:p-6 mb-8 shadow-md">
        <div className="flex items-center justify-between mb-3 text-xs text-stone-400">
          <span className="font-semibold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5 text-amber-400" />
            Original Audio 原音频
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-stone-300">
              {formatMinSec(currentTime)} / {formatMinSec(duration)}
            </span>
          </div>
        </div>

        {/* Scrubber */}
        <div className="flex items-center gap-3 mb-4">
          <button
            id="btn-play-full-audio"
            onClick={togglePlayFull}
            className="w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-sm"
          >
            {isPlayingFull ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 10}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-stone-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Audio controls footer */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs text-stone-400">
          <div className="flex items-center gap-1.5">
            <span>倍速：</span>
            {speedOptions.map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackSpeed(rate)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                  playbackSpeed === rate
                    ? 'bg-amber-400 text-stone-950 font-bold'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {lesson.isVideo && (
              <button
                onClick={() => setShowVideo(!showVideo)}
                className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] flex items-center gap-1 transition-colors border border-stone-700"
              >
                {showVideo ? '隐藏视频画面' : '显示视频画面'}
              </button>
            )}
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              点击下方单句可独立播放与跟读测评
            </span>
          </div>
        </div>
      </div>

      {/* Main Views Switcher Tab Bar */}
      <div className="flex items-center justify-between gap-3 mb-6 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
        <button
          id="tab-view-sentences"
          onClick={() => setActiveTab('sentences')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sentences'
              ? 'bg-white text-stone-950 shadow-xs border border-stone-200/80'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-600" />
          <span>逐句跟读练习 ({lesson.sentences.length} 句)</span>
        </button>

        <button
          id="tab-view-diagnosis"
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all relative ${
            activeTab === 'report'
              ? 'bg-white text-stone-950 shadow-xs border border-stone-200/80'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-600" />
          <span>全篇发音诊断与纠错</span>
          {report.traps.length > 0 && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900">
              {report.phoneticTrapsCount} 处陷阱预警
            </span>
          )}
        </button>
      </div>

      {activeTab === 'report' ? (
        <DocumentPronunciationReportView
          lesson={lesson}
          report={report}
          onSelectSentence={(sentence) => {
            setActiveTab('sentences');
            onSelectSentence(sentence);
          }}
        />
      ) : (
        /* Sentences List Section matching Section 7 */
        <div>
          <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <span>Sentences 切割句子列表</span>
            <span className="text-xs font-normal text-stone-600">
              (点击卡片进入单句练习)
            </span>
          </h2>
          <span className="text-xs text-stone-600">
            已练 {Object.keys(lesson.practiceRecords).length}/{lesson.sentences.length}
          </span>
        </div>

        <div className="space-y-3">
          {lesson.sentences.map((item, idx) => {
            const numStr = String(idx + 1).padStart(2, '0');
            const record = lesson.practiceRecords[item.id];
            const isPlayingThis = playingSentenceId === item.id;

            return (
              <div
                key={item.id}
                id={`sentence-row-${item.id}`}
                onClick={() => onSelectSentence(item)}
                className="bg-white rounded-xl border border-stone-200 hover:border-amber-400 p-4 sm:p-5 transition-all shadow-2xs hover:shadow-xs cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-600 font-mono text-xs font-semibold flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                    {numStr}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm sm:text-base font-semibold text-stone-900 tracking-tight group-hover:text-amber-900 transition-colors">
                        {item.text}
                      </span>
                    </div>

                    {item.translation && (
                      <p className="text-xs text-stone-600 mb-1.5">
                        {item.translation}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-stone-600 font-mono">
                      <span>
                        {formatMinSec(item.startTime)} - {formatMinSec(item.endTime)}
                      </span>
                      {item.linkingTip && (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          连读：{item.linkingTip.phrase} → {item.linkingTip.naturalPronunciation}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Play segment button */}
                  <button
                    id={`btn-play-sentence-${item.id}`}
                    onClick={(e) => playSentenceSegment(e, item)}
                    title="播放单句原音"
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                      isPlayingThis
                        ? 'bg-amber-500 text-white'
                        : 'bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900'
                    }`}
                  >
                    {isPlayingThis ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Practice status / score badge */}
                  {record ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{record.feedback.overallScore} 分</span>
                    </div>
                  ) : (
                    <span className="text-xs text-stone-600 px-2 py-1 bg-stone-50 rounded-md">
                      未练习
                    </span>
                  )}

                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 group-hover:text-amber-700 transition-colors">
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
};
