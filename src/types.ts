export interface WordAnalysis {
  word: string;
  status: 'correct' | 'imperfect' | 'missed';
  ipa?: string;
  tip?: string;
}

export interface SentenceItem {
  id: string; // e.g. "001"
  index: number;
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  translation?: string;
  phoneticHint?: string;
  linkingTip?: {
    phrase: string;
    naturalPronunciation: string;
    explanation: string;
  };
}

export interface AIFeedback {
  pronunciationScore: number;
  fluencyScore: number;
  accuracyScore: number;
  overallScore: number;
  userTranscribedText: string;
  strengths: string;
  improvements: string;
  advice: string;
  linkingAnalysis?: string;
  words?: WordAnalysis[];
}

export interface PracticeRecord {
  sentenceId: string;
  audioBlobUrl?: string;
  audioBase64?: string;
  mimeType?: string;
  recordedAt: number;
  duration: number;
  feedback: AIFeedback;
}

export interface PhoneticTrapExample {
  word: string;
  sentenceIdx: number;
  context: string;
  ipa: string;
  commonError: string;
  correctionTip: string;
}

export interface PhoneticTrap {
  id: string;
  type: string;
  title: string;
  symbol: string;
  count: number;
  explanation: string;
  correctionGuide: string;
  examples: PhoneticTrapExample[];
}

export interface WordPhoneticItem {
  word: string;
  ipa: string;
  count: number;
  trapType?: string;
  commonError?: string;
  tip?: string;
}

export interface DocumentPronunciationReport {
  overallDifficulty: 'A2 初级' | 'B1 进阶' | 'B2 中高级' | 'C1 熟练';
  totalWords: number;
  uniqueWords: number;
  estCadenceWPM: number;
  phoneticTrapsCount: number;
  linkingCount: number;
  traps: PhoneticTrap[];
  linkingList: Array<{
    phrase: string;
    naturalPronunciation: string;
    explanation: string;
    sentenceIdx: number;
  }>;
  allWordsPhoneticList: WordPhoneticItem[];
  summaryDiagnosis: string;
  recommendedFocus: string[];
}

export interface AudioLesson {
  id: string;
  title: string;
  description?: string;
  category: 'preset' | 'upload';
  tag?: string;
  uploadDate: string;
  duration: number;
  audioUrl: string;
  audioBlob?: Blob;
  isVideo?: boolean;
  isDocument?: boolean;
  sentences: SentenceItem[];
  practiceRecords: Record<string, PracticeRecord>; // keyed by sentenceId
  documentReport?: DocumentPronunciationReport;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
}
