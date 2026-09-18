import React, { useState } from 'react';
import {
  Sparkles,
  Volume2,
  AlertTriangle,
  Link as LinkIcon,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  Target,
  ArrowRight,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { AudioLesson, DocumentPronunciationReport, SentenceItem } from '../types';
import { speakText } from '../utils/audio';

interface DocumentPronunciationReportViewProps {
  lesson: AudioLesson;
  report: DocumentPronunciationReport;
  onSelectSentence: (sentence: SentenceItem) => void;
}

export const DocumentPronunciationReportView: React.FC<DocumentPronunciationReportViewProps> = ({
  lesson,
  report,
  onSelectSentence,
}) => {
  const [activeTab, setActiveTab] = useState<'traps' | 'linking' | 'words' | 'mistakes'>('traps');
  const [expandedTrapId, setExpandedTrapId] = useState<string | null>(
    report.traps[0]?.id || null
  );

  // Compute user practice stats across all sentences in this lesson
  const records = Object.values(lesson.practiceRecords || {});
  const practicedCount = records.length;
  const totalSentences = lesson.sentences.length;
  const avgOverall =
    practicedCount > 0
      ? Math.round(
          records.reduce((acc, r) => acc + (r.feedback?.overallScore || 0), 0) / practicedCount
        )
      : null;
  const avgPronunciation =
    practicedCount > 0
      ? Math.round(
          records.reduce((acc, r) => acc + (r.feedback?.pronunciationScore || 0), 0) /
            practicedCount
        )
      : null;
  const avgFluency =
    practicedCount > 0
      ? Math.round(
          records.reduce((acc, r) => acc + (r.feedback?.fluencyScore || 0), 0) / practicedCount
        )
      : null;
  const avgAccuracy =
    practicedCount > 0
      ? Math.round(
          records.reduce((acc, r) => acc + (r.feedback?.accuracyScore || 0), 0) / practicedCount
        )
      : null;

  // Extract all imperfect/missed words recorded across user attempts
  interface UserMistake {
    word: string;
    ipa?: string;
    tip?: string;
    sentenceId: string;
    sentenceIdx: number;
    sentenceText: string;
  }
  const userMistakes: UserMistake[] = [];
  records.forEach((rec) => {
    const sItem = lesson.sentences.find((s) => s.id === rec.sentenceId);
    if (rec.feedback?.words && sItem) {
      rec.feedback.words.forEach((w) => {
        if (w.status === 'imperfect' || w.status === 'missed') {
          userMistakes.push({
            word: w.word,
            ipa: w.ipa,
            tip: w.tip,
            sentenceId: rec.sentenceId,
            sentenceIdx: sItem.index,
            sentenceText: sItem.text,
          });
        }
      });
    }
  });

  const handleSpeak = (text: string) => {
    speakText(text, 0.9);
  };

  return (
    <div className="space-y-6">
      {/* Header Diagnostic Card */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-stone-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400 text-stone-950">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              全篇发音诊断与纠错体检报告
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              语篇难度: {report.overallDifficulty}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-800 text-stone-300 border border-stone-700">
              语速: {report.estCadenceWPM} WPM
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed mb-6 max-w-3xl">
          {report.summaryDiagnosis}
        </p>

        {/* 4 Key Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-800/80">
          <div className="bg-stone-800/60 rounded-xl p-3 border border-stone-700/50">
            <div className="text-xs text-stone-400 mb-1">识别总词数 / 去重</div>
            <div className="text-lg sm:text-xl font-bold text-white font-mono">
              {report.totalWords}{' '}
              <span className="text-xs font-normal text-stone-400">/ {report.uniqueWords} 词</span>
            </div>
          </div>

          <div className="bg-stone-800/60 rounded-xl p-3 border border-stone-700/50">
            <div className="text-xs text-stone-400 mb-1">发音易错陷阱</div>
            <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono">
              {report.phoneticTrapsCount}{' '}
              <span className="text-xs font-normal text-stone-400">处关键点</span>
            </div>
          </div>

          <div className="bg-stone-800/60 rounded-xl p-3 border border-stone-700/50">
            <div className="text-xs text-stone-400 mb-1">自然连读与弱读</div>
            <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">
              {report.linkingCount}{' '}
              <span className="text-xs font-normal text-stone-400">处音律</span>
            </div>
          </div>

          <div className="bg-stone-800/60 rounded-xl p-3 border border-stone-700/50">
            <div className="text-xs text-stone-400 mb-1">我的跟读综合得分</div>
            <div className="text-lg sm:text-xl font-bold font-mono">
              {avgOverall !== null ? (
                <span className={avgOverall >= 85 ? 'text-emerald-400' : 'text-amber-400'}>
                  {avgOverall} <span className="text-xs font-normal text-stone-400">/ 100</span>
                </span>
              ) : (
                <span className="text-xs font-normal text-stone-500">未开始跟读</span>
              )}
            </div>
          </div>
        </div>

        {/* User Practice Progress Detail (if practiced) */}
        {avgOverall !== null && (
          <div className="mt-4 pt-3 border-t border-stone-800/60 flex flex-wrap items-center justify-between text-xs text-stone-300 gap-2">
            <div className="flex items-center gap-4">
              <span>
                发音准确分：<strong className="text-amber-400">{avgPronunciation}</strong>
              </span>
              <span>
                口语流利分：<strong className="text-emerald-400">{avgFluency}</strong>
              </span>
              <span>
                单词匹配率：<strong className="text-sky-400">{avgAccuracy}%</strong>
              </span>
            </div>
            <span className="text-stone-400">
              已完成跟读评测: {practicedCount}/{totalSentences} 句
            </span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('traps')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'traps'
              ? 'bg-amber-400 text-stone-950 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>高频发音陷阱 ({report.traps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('linking')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'linking'
              ? 'bg-amber-400 text-stone-950 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>连读与弱读音律 ({report.linkingList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('words')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'words'
              ? 'bg-amber-400 text-stone-950 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>重点词汇标准音标 ({report.allWordsPhoneticList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mistakes')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'mistakes'
              ? 'bg-amber-400 text-stone-950 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>跟读错词库 ({userMistakes.length})</span>
        </button>
      </div>

      {/* Tab 1: Phonetic Traps */}
      {activeTab === 'traps' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>全篇发音陷阱识别算法</strong>：针对中国学习者在长音频/长文档中常见的
              /θ/、/ð/、/v/、/w/、长短元音辨析及失去爆破等易错点，列出全文出现的所有实例与正确舌位口型，提前预警！
            </div>
          </div>

          <div className="space-y-3">
            {report.traps.map((trap) => {
              const isExpanded = expandedTrapId === trap.id;
              return (
                <div
                  key={trap.id}
                  className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedTrapId(isExpanded ? null : trap.id)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="w-10 h-10 rounded-xl bg-stone-100 text-stone-900 font-mono font-bold text-sm flex items-center justify-center border border-stone-200">
                        {trap.symbol}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-bold text-stone-900">
                            {trap.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                            全文出现 {trap.count} 次
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                          {trap.explanation}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-stone-400">
                      <span className="text-xs text-stone-400 hidden sm:inline">
                        {isExpanded ? '收起要领' : '查看口型与例词'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-stone-100 bg-stone-50/50 space-y-4">
                      {/* Correction guide box */}
                      <div className="bg-white p-4 rounded-xl border border-stone-200">
                        <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                          口型与舌位发音要领
                        </div>
                        <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                          {trap.correctionGuide}
                        </p>
                      </div>

                      {/* Examples from the document */}
                      <div>
                        <div className="text-xs font-semibold text-stone-600 mb-2">
                          本课例词与出现句子：
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {trap.examples.map((ex, exIdx) => {
                            const targetSentence = lesson.sentences.find(
                              (s) => s.index === ex.sentenceIdx
                            );
                            return (
                              <div
                                key={exIdx}
                                className="bg-white p-3 rounded-lg border border-stone-200 flex flex-col justify-between gap-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-stone-900 text-sm">
                                      {ex.word}
                                    </span>
                                    <span className="font-mono text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                      /{ex.ipa}/
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleSpeak(ex.word)}
                                    className="p-1 text-stone-400 hover:text-stone-900 rounded hover:bg-stone-100"
                                    title="试听发音"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="text-[11px] text-stone-500 italic line-clamp-1">
                                  原句 #{ex.sentenceIdx}: "{ex.context}"
                                </div>
                                <div className="text-[11px] text-red-600 font-medium bg-red-50/70 p-1.5 rounded">
                                  避坑提示：{ex.correctionTip}
                                </div>
                                {targetSentence && (
                                  <button
                                    onClick={() => onSelectSentence(targetSentence)}
                                    className="text-[11px] text-amber-700 hover:text-amber-800 font-medium flex items-center justify-end gap-1 mt-1"
                                  >
                                    <span>去练习此句</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Linking & Connected Speech */}
      {activeTab === 'linking' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs sm:text-sm text-emerald-900 flex items-start gap-3">
            <LinkIcon className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong>自然口语连读音律分析</strong>：地道英语口语不是机械逐词顿挫，而是通过辅音与元音的连缀、闪音与弱读形成节奏韵律。掌握全篇连读点，让你的口语瞬间摆脱中式生硬！
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.linkingList.map((link, idx) => {
              const targetSentence = lesson.sentences.find((s) => s.index === link.sentenceIdx);
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-2xs hover:border-emerald-400 transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-stone-900 text-base">{link.phrase}</span>
                      <button
                        onClick={() => handleSpeak(link.phrase)}
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                        title="试听发音"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="inline-block px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-mono text-xs font-semibold mb-2">
                      连读音标：{link.naturalPronunciation}
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed">{link.explanation}</p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-stone-400">出现在第 {link.sentenceIdx} 句</span>
                    {targetSentence && (
                      <button
                        onClick={() => onSelectSentence(targetSentence)}
                        className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
                      >
                        <span>进入此句练习</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Key Vocabulary Phonetics */}
      {activeTab === 'words' && (
        <div className="space-y-4">
          <div className="p-4 bg-stone-100 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-800 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-stone-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>全篇重点词汇标准音标总览</strong>：已提取文档中出现的高频词与核心词汇，点击右侧扬声器可试听标准音标发音，观察开口度与重音。
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {report.allWordsPhoneticList.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-stone-200 p-3.5 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-stone-900 text-base">{item.word}</div>
                    <div className="font-mono text-xs text-amber-700 font-medium">/{item.ipa}/</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-stone-400 font-mono">
                      x{item.count}次
                    </span>
                    <button
                      onClick={() => handleSpeak(item.word)}
                      className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                      title="发音试听"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-lg leading-relaxed">
                  {item.tip}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: User Mistakes and Remediation */}
      {activeTab === 'mistakes' && (
        <div className="space-y-4">
          {userMistakes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-stone-900">暂无待纠正错词</h4>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                在单句练习中完成录音跟读后，系统会自动对比发音，将需注意或误读的词汇汇聚于此，方便针对性专项攻克！
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>跟读评测易错词汇纠错薄</strong>：以下词汇在您的跟读录音中曾被识别为发音偏离或吞音。点击单词可试听标准音，或直接进入对应句子重练。
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {userMistakes.map((m, idx) => {
                  const targetSentence = lesson.sentences.find((s) => s.id === m.sentenceId);
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-amber-300 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-base">{m.word}</span>
                            {m.ipa && (
                              <span className="font-mono text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                /{m.ipa}/
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                            来自第 {m.sentenceIdx} 句: "{m.sentenceText}"
                          </p>
                        </div>
                        <button
                          onClick={() => handleSpeak(m.word)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                          title="听标准发音"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {m.tip && (
                        <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg leading-relaxed">
                          💡 纠错建议：{m.tip}
                        </div>
                      )}

                      {targetSentence && (
                        <div className="pt-2 border-t border-stone-100 flex justify-end">
                          <button
                            onClick={() => onSelectSentence(targetSentence)}
                            className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
                          >
                            <span>重练此句</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
