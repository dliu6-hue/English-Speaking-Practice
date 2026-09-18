import React from 'react';
import { Headphones, Sparkles, UploadCloud, ListMusic } from 'lucide-react';
import { AudioLesson } from '../types';

interface HeaderProps {
  activeLesson: AudioLesson | null;
  currentView: 'home' | 'list' | 'practice';
  onNavigateHome: () => void;
  onNavigateList: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeLesson,
  currentView,
  onNavigateHome,
  onNavigateList,
}) => {
  return (
    <header className="w-full bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          id="app-brand-button"
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
            <Headphones className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-stone-900 text-base sm:text-lg">
                English Speaking Practice
              </span>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">
                V1.0 MVP
              </span>
            </div>
            <p className="text-xs text-stone-600 hidden sm:block">
              AI-Powered Shadowing & Pronunciation Coach
            </p>
          </div>
        </div>

        {/* Navigation context */}
        <div className="flex items-center gap-2">
          {activeLesson && (
            <>
              {currentView === 'practice' && (
                <button
                  id="nav-to-sentence-list"
                  onClick={onNavigateList}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sentences List</span>
                  <span className="sm:hidden">List</span>
                </button>
              )}

              <button
                id="nav-change-audio"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Change Audio</span>
                <span className="sm:hidden">Upload</span>
              </button>
            </>
          )}

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3 text-emerald-700" />
            <span>AI Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};
