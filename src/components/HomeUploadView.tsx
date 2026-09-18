import React, { useState, useRef } from 'react';
import {
  Upload,
  Music,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  FileAudio,
  Radio,
  MessageSquareQuote,
  Tv,
  FileText,
  FileCode,
} from 'lucide-react';
import { AudioLesson } from '../types';
import { blobToBase64, decodeAudioTo16kWavBlob } from '../utils/audio';

interface HomeUploadViewProps {
  recentLessons: AudioLesson[];
  onSelectLesson: (lesson: AudioLesson) => void;
  onAudioProcessed: (lesson: AudioLesson) => void;
}

export const HomeUploadView: React.FC<HomeUploadViewProps> = ({
  recentLessons,
  onSelectLesson,
  onAudioProcessed,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedTitle, setPastedTitle] = useState('');
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { label: '文件解析与音轨提取', desc: 'File & Audio Extraction' },
    { label: '全篇语音识别与转录', desc: 'Full-Coverage Whisper Transcription' },
    { label: '精准分句与音律检测', desc: 'Sentence Segmentation & Linking' },
    { label: '全篇发音诊断与纠错生成', desc: 'Phonetic Diagnosis & Error Correction' },
  ];

  const handleFile = async (file: File) => {
    if (!file) return;

    // Check extension
    const validExtensions = [
      'mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm', 'flac',
      'mp4', 'mov', 'avi', 'mkv', 'm4v', '3gp', 'wmv',
      'txt', 'srt', 'vtt', 'md'
    ];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isDoc = ['txt', 'srt', 'vtt', 'md'].includes(ext);
    const isMedia =
      validExtensions.includes(ext) ||
      file.type.startsWith('audio/') ||
      file.type.startsWith('video/') ||
      isDoc;

    if (!isMedia) {
      setErrorMessage('请上传支持的音视频或字幕文档格式（MP4 / MOV / WebM / MP3 / WAV / SRT / VTT / TXT 等）');
      return;
    }

    const isVideo =
      file.type.startsWith('video/') ||
      ['mp4', 'mov', 'avi', 'mkv', 'm4v', '3gp', 'wmv'].includes(ext);

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(15);
    setCurrentStepIndex(0);

    const mediaBlobUrl = isDoc ? '' : URL.createObjectURL(file);

    try {
      // Step 1: Prepare & read basic metadata & pre-decode to 16kHz WAV for instant cloud compatibility
      let clientDuration = 0;
      let preconvertedWav: Blob | null = null;

      if (!isDoc) {
        try {
          const mediaEl = document.createElement(isVideo ? 'video' : 'audio');
          mediaEl.preload = 'metadata';
          mediaEl.src = mediaBlobUrl;
          clientDuration = await new Promise<number>((resolve) => {
            mediaEl.onloadedmetadata = () => resolve(mediaEl.duration || 0);
            mediaEl.onerror = () => resolve(0);
            setTimeout(() => resolve(0), 1500);
          });
        } catch {
          // Fallback to server duration
        }

        try {
          // Use hardware-accelerated Web Audio API to decode and resample to 16kHz mono WAV
          const decoded = await decodeAudioTo16kWavBlob(file);
          if (decoded && decoded.wavBlob) {
            preconvertedWav = decoded.wavBlob;
            if (decoded.duration > 0) {
              clientDuration = decoded.duration;
            }
          }
        } catch (decErr) {
          console.warn('[Upload] Client-side audio decoding fallback:', decErr);
        }
      }

      setProgressPercent(45);
      setCurrentStepIndex(1); // Speech-to-Text with Whisper or doc parsing

      // Upload via FormData with 16kHz WAV or original media
      const formData = new FormData();
      if (preconvertedWav) {
        formData.append('file', preconvertedWav, `${file.name.replace(/\.[^/.]+$/, '')}_16k.wav`);
        formData.append('originalFilename', file.name);
      } else {
        formData.append('file', file);
        formData.append('originalFilename', file.name);
      }
      formData.append('filename', file.name);
      if (clientDuration > 0) {
        formData.append('duration', String(clientDuration));
      }

      setProgressPercent(65);
      setCurrentStepIndex(2); // Sentence Segmentation & Phonetics

      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || '文件处理失败，请确认包含清晰英语语音或文本');
      }

      const result = await response.json();
      setProgressPercent(90);
      setCurrentStepIndex(3); // Generating sentences & report

      await new Promise((r) => setTimeout(r, 500));
      setProgressPercent(100);

      const realDuration = result.duration || clientDuration || 15;
      const titleName = file.name.replace(/\.[^/.]+$/, '');
      const newLesson: AudioLesson = {
        id: `upload-${Date.now()}`,
        title: titleName,
        category: 'upload',
        tag: isDoc ? 'Document' : isVideo ? 'My Video' : 'My Audio',
        uploadDate: new Date().toISOString().split('T')[0],
        duration: realDuration,
        audioUrl: mediaBlobUrl,
        audioBlob: isDoc ? undefined : file,
        isVideo,
        isDocument: isDoc,
        sentences: result.sentences || [],
        practiceRecords: {},
        documentReport: result.documentReport,
      };

      setTimeout(() => {
        setIsProcessing(false);
        onAudioProcessed(newLesson);
      }, 400);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '处理失败，请重试');
      setIsProcessing(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressPercent(30);
    setCurrentStepIndex(1);

    try {
      const title = pastedTitle.trim() || 'Imported Speech Transcript';
      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: pastedText,
          filename: `${title}.txt`,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || '解析文档失败');
      }

      const result = await response.json();
      setProgressPercent(85);
      setCurrentStepIndex(3);

      await new Promise((r) => setTimeout(r, 400));
      setProgressPercent(100);

      const newLesson: AudioLesson = {
        id: `doc-${Date.now()}`,
        title,
        category: 'upload',
        tag: 'My Document',
        uploadDate: new Date().toISOString().split('T')[0],
        duration: result.duration || 15,
        audioUrl: '',
        isVideo: false,
        isDocument: true,
        sentences: result.sentences || [],
        practiceRecords: {},
        documentReport: result.documentReport,
      };

      setShowPasteModal(false);
      setPastedText('');
      setPastedTitle('');

      setTimeout(() => {
        setIsProcessing(false);
        onAudioProcessed(newLesson);
      }, 400);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '处理文本失败');
      setIsProcessing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const getLessonIcon = (tag?: string) => {
    if (tag?.includes('Podcast')) return <Radio className="w-5 h-5 text-amber-500" />;
    if (tag?.includes('Interview')) return <Tv className="w-5 h-5 text-indigo-500" />;
    if (tag?.includes('Conversation')) return <MessageSquareQuote className="w-5 h-5 text-emerald-500" />;
    if (tag?.includes('Document')) return <FileText className="w-5 h-5 text-sky-500" />;
    return <FileAudio className="w-5 h-5 text-stone-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Hero Header matching PRD */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>AI 驱动的真实音频逐句跟读与口语反馈</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mb-2">
          English Speaking Practice
        </h1>
        <p className="text-stone-600 text-sm sm:text-base">
          Upload your English audio — AI 自动切句 · 原音对比 · 智能口语诊断
        </p>
      </div>

      {/* Processing State Overlay / Card */}
      {isProcessing ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-10 mb-10 max-w-xl mx-auto text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center animate-pulse">
            <Music className="w-7 h-7 text-amber-600 animate-spin" />
          </div>

          <h2 className="text-lg font-semibold text-stone-900 mb-1">正在处理你的音频...</h2>
          <p className="text-xs text-stone-600 mb-6">
            AI 正在进行语音识别、生成时间戳并进行自然句子切割
          </p>

          {/* Progress bar matching PRD visual */}
          <div className="w-full bg-stone-100 rounded-full h-3 mb-2 overflow-hidden border border-stone-200">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-mono text-stone-600 mb-8">
            <span>Processing</span>
            <span className="font-semibold text-amber-600">{progressPercent}%</span>
          </div>

          {/* Steps checklist matching PRD */}
          <div className="bg-stone-50 rounded-xl p-4 text-left space-y-3 border border-stone-200/70">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              正在进行系统流程：
            </div>
            {steps.map((s, idx) => {
              const isDone = idx < currentStepIndex || progressPercent === 100;
              const isCurrent = idx === currentStepIndex && progressPercent < 100;
              return (
                <div key={s.label} className="flex items-center gap-3 text-sm">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : isCurrent ? (
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-600 font-bold">→</span>
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-stone-300 flex-shrink-0" />
                  )}
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`font-medium ${
                        isDone
                          ? 'text-stone-800 line-through text-stone-600'
                          : isCurrent
                          ? 'text-amber-700 font-semibold'
                          : 'text-stone-600'
                      }`}
                    >
                      {s.label}
                    </span>
                    <span className="text-xs text-stone-600">({s.desc})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Upload Area matching Section 4.1 */
        <div className="mb-10">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
            accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm,.mp4,.mov,.mkv,.avi,.m4v,.3gp,.txt,.srt,.vtt,.md"
            className="hidden"
            id="audio-file-input"
          />

          <div
            id="audio-upload-dropzone"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer group relative rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all ${
              isDragging
                ? 'border-amber-500 bg-amber-50/50'
                : 'border-stone-300 hover:border-amber-500 bg-white hover:bg-stone-50/70 shadow-xs'
            }`}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 transition-transform group-hover:scale-105">
              <Upload className="w-8 h-8 text-amber-600" />
            </div>

            <h2 className="text-lg font-semibold text-stone-900 mb-1">
              Upload Video / Audio / Document
            </h2>
            <p className="text-sm text-stone-600 mb-4 max-w-md mx-auto">
              拖拽英语视频、音频或字幕文档（SRT/VTT/TXT）到此处，AI 自动完整识别全文、精准切句并生成发音纠错报告
            </p>

            <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium">
              <span className="text-stone-500">格式支持:</span>
              <span className="font-semibold text-stone-800">MP4 / MOV / WebM / MP3 / WAV / SRT / VTT / TXT</span>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs text-center">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Alternative: Direct Text Paste Action */}
          <div className="mt-4 flex items-center justify-center">
            <button
              id="btn-open-paste-modal"
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-amber-800 bg-stone-100/80 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 px-4 py-2 rounded-xl transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>没有音视频文件？直接粘贴文本 / 演讲稿生成逐句课程与诊断</span>
            </button>
          </div>
        </div>
      )}

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-stone-200 p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    导入文本 / 字幕稿
                  </h3>
                  <p className="text-xs text-stone-500">
                    输入一段英文文本或字幕，系统将识别出文档中的全部语句并提供发音诊断
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  材料标题 (可选)
                </label>
                <input
                  type="text"
                  placeholder="例如：Steve Jobs Speech 2005"
                  value={pastedTitle}
                  onChange={(e) => setPastedTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-200 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  英文内容 / SRT 字幕文本
                </label>
                <textarea
                  rows={6}
                  placeholder="粘贴英文段落，例如：
Stay hungry, stay foolish.
Never let the noise of others' opinions drown out your own inner voice.
Have the courage to follow your heart and intuition."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-stone-200 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handlePasteSubmit}
                  disabled={!pastedText.trim()}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-98 disabled:opacity-50 text-stone-950 rounded-lg shadow-2xs transition-all"
                >
                  开始识别与发音诊断
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Practice section matching PRD 4.1 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-stone-900">
              Recent Practice
            </h2>
            <span className="text-xs text-stone-600 hidden sm:inline">
              最近精选语料库，可直接开启练习
            </span>
          </div>
          <span className="text-xs font-mono text-stone-600">
            {recentLessons.length} available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {recentLessons.map((lesson) => {
            const practicedCount = Object.keys(lesson.practiceRecords).length;
            const totalSentences = lesson.sentences.length;
            const progress = Math.round((practicedCount / (totalSentences || 1)) * 100);

            // Average score
            const scores = Object.values(lesson.practiceRecords).map(
              (r) => r.feedback.overallScore
            );
            const avgScore =
              scores.length > 0
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                : null;

            return (
              <div
                key={lesson.id}
                id={`recent-lesson-${lesson.id}`}
                onClick={() => onSelectLesson(lesson)}
                className="bg-white rounded-xl border border-stone-200 p-5 hover:border-amber-400 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {getLessonIcon(lesson.tag)}
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                      {lesson.tag || 'Audio'}
                    </span>
                  </div>

                  <h3 className="font-semibold text-stone-900 text-sm mb-1 group-hover:text-amber-700 transition-colors line-clamp-1">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-2 mb-4">
                    {lesson.description || `${totalSentences} sentences segmented for speaking.`}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100">
                  <div className="flex items-center justify-between text-xs text-stone-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-600" />
                      {Math.round(lesson.duration)}s · {totalSentences} 句
                    </span>
                    {avgScore !== null && (
                      <span className="font-semibold text-emerald-600">
                        {avgScore} 分
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium text-amber-700 group-hover:text-amber-800">
                    <span>
                      {practicedCount > 0
                        ? `已练习 ${practicedCount}/${totalSentences} 句`
                        : '开始逐句练习'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
