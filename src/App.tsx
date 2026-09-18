/**
 * English Speaking Practice - Main Application
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeUploadView } from './components/HomeUploadView';
import { SentenceListView } from './components/SentenceListView';
import { SentencePracticeView } from './components/SentencePracticeView';
import { PRESET_LESSONS } from './data/presets';
import { AudioLesson, SentenceItem, PracticeRecord } from './types';

const STORAGE_KEY = 'english_practice_lessons_v1';

export default function App() {
  const [lessons, setLessons] = useState<AudioLesson[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge presets with saved practice records
          return PRESET_LESSONS.map((preset) => {
            const match = parsed.find((p: any) => p.id === preset.id);
            return match
              ? {
                  ...preset,
                  practiceRecords: {
                    ...preset.practiceRecords,
                    ...match.practiceRecords,
                  },
                }
              : preset;
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load from storage:', e);
    }
    return PRESET_LESSONS;
  });

  const [currentView, setCurrentView] = useState<'home' | 'list' | 'practice'>('home');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      const serializableLessons = lessons.map((l) => ({
        id: l.id,
        title: l.title,
        category: l.category,
        tag: l.tag,
        uploadDate: l.uploadDate,
        duration: l.duration,
        practiceRecords: l.practiceRecords,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableLessons));
    } catch (err) {
      console.warn('Storage save failed:', err);
    }
  }, [lessons]);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) || null;
  const activeSentence =
    activeLesson?.sentences.find((s) => s.id === activeSentenceId) ||
    activeLesson?.sentences[0] ||
    null;

  const handleSelectLesson = (lesson: AudioLesson) => {
    setActiveLessonId(lesson.id);
    setActiveSentenceId(lesson.sentences[0]?.id || null);
    setCurrentView('list');
  };

  const handleAudioProcessed = (newLesson: AudioLesson) => {
    setLessons((prev) => [newLesson, ...prev]);
    setActiveLessonId(newLesson.id);
    setActiveSentenceId(newLesson.sentences[0]?.id || null);
    setCurrentView('list');
  };

  const handleSelectSentence = (sentence: SentenceItem) => {
    setActiveSentenceId(sentence.id);
    setCurrentView('practice');
  };

  const handleSaveRecord = (record: PracticeRecord) => {
    if (!activeLessonId) return;
    setLessons((prev) =>
      prev.map((les) => {
        if (les.id === activeLessonId) {
          return {
            ...les,
            practiceRecords: {
              ...les.practiceRecords,
              [record.sentenceId]: record,
            },
          };
        }
        return les;
      })
    );
  };

  return (
    <div className="min-h-screen bg-stone-50/60 text-stone-900 flex flex-col font-sans selection:bg-amber-200 selection:text-stone-900">
      <Header
        activeLesson={activeLesson}
        currentView={currentView}
        onNavigateHome={() => setCurrentView('home')}
        onNavigateList={() => setCurrentView('list')}
      />

      <main className="flex-1">
        {currentView === 'home' && (
          <HomeUploadView
            recentLessons={lessons}
            onSelectLesson={handleSelectLesson}
            onAudioProcessed={handleAudioProcessed}
          />
        )}

        {currentView === 'list' && activeLesson && (
          <SentenceListView
            lesson={activeLesson}
            onSelectSentence={handleSelectSentence}
            onBack={() => setCurrentView('home')}
          />
        )}

        {currentView === 'practice' && activeLesson && activeSentence && (
          <SentencePracticeView
            lesson={activeLesson}
            sentence={activeSentence}
            practiceRecord={activeLesson.practiceRecords[activeSentence.id]}
            onSaveRecord={handleSaveRecord}
            onNavigateSentence={(newSentence) => setActiveSentenceId(newSentence.id)}
            onBackToList={() => setCurrentView('list')}
          />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-600 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>English Speaking Practice · 英语口语逐句跟读与智能评测系统</span>
          <span className="font-mono text-stone-600">
            Speech-to-Text · Sentence Segmentation · Pronunciation Feedback
          </span>
        </div>
      </footer>
    </div>
  );
}
