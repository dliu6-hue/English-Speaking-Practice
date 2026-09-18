import { DocumentPronunciationReport, PhoneticTrap, SentenceItem, WordPhoneticItem } from '../types';

export const CLIENT_PHONETIC_TRAPS = [
  {
    id: 'th-sounds',
    type: '咬舌齿间音',
    title: '咬舌音 /θ/ 与 /ð/',
    symbol: '/θ/ & /ð/',
    explanation:
      '中国学习者最易混淆为 /s/、/z/ 或 /d/。发音时上下齿必须轻咬舌尖前部，气流从舌齿缝隙摩擦而出。',
    correctionGuide:
      '把舌尖伸出上下齿缘约 2-3 毫米，不要收在牙齿后面。/θ/（think, through）是不带声带振动的清辅音；/ð/（this, that, with）带声带振动。',
    matcher: (w: string) => /th/i.test(w),
    commonError: '误念成 /s/, /z/, /d/',
    correctionTip: (w: string) => `必须咬舌尖！"${w}" 中的 "th" 切忌读成 s 或 d。`,
  },
  {
    id: 'v-w-sounds',
    type: '唇齿音 vs 双唇音',
    title: '唇齿音 /v/ 与双唇音 /w/',
    symbol: '/v/ vs /w/',
    explanation:
      '发 /v/ 时上门牙必须接触下嘴唇内侧微振动；发 /w/ 时双唇必须收拢圆唇向前突出，牙齿不碰嘴唇。',
    correctionGuide:
      '/v/（very, have, voice）：上齿轻咬下唇；/w/（we, will, want）：嘴唇嘟圆如吹哨。',
    matcher: (w: string) => /\bv/i.test(w) || /\bw/i.test(w),
    commonError: '将 /v/ 发成 /w/，或者 /w/ 没有圆唇',
    correctionTip: (w: string) =>
      w.toLowerCase().startsWith('v')
        ? `"${w}" 的 "v" 是唇齿音，上门牙必须触碰下唇！`
        : `"${w}" 的 "w" 是双唇音，嘴唇必须嘟圆突出，不可咬唇！`,
  },
  {
    id: 'short-long-i',
    type: '长短元音辨析',
    title: '紧松元音 /iː/ 与 /ɪ/',
    symbol: '/iː/ vs /ɪ/',
    explanation:
      '/iː/（feel, leave, meet）嘴角向两侧裂开，肌肉紧张；/ɪ/（fill, live, it）舌位较低，肌肉放松，短促有力。',
    correctionGuide:
      '不要只看音长，关键是肌肉紧张度。读 /ɪ/ 时下巴稍落，音色介于"一"和"挨"之间。',
    matcher: (w: string) =>
      /ee|ea|ie/i.test(w) || (/\bi[t|s|n|f|d|g|ll|m|p]/i.test(w) && w.length <= 5),
    commonError: '把短松 /ɪ/ 读成拉长的 /iː/，导致 live 听成 leave',
    correctionTip: (w: string) =>
      /ee|ea/i.test(w)
        ? `"${w}" 为长紧音 /iː/，嘴角向两边拉开，肌肉收紧。`
        : `"${w}" 为短松音 /ɪ/，下颚微微放松，短促干脆。`,
  },
  {
    id: 'open-ae',
    type: '大开口梅花音',
    title: '前元音 /æ/（梅花音）',
    symbol: '/æ/',
    explanation:
      '发 /æ/（ask, can, man, back）时下巴要落得足够低，开口度达三指宽，舌尖抵下齿背。',
    correctionGuide:
      '如果开口太小，容易把 /æ/ 发成 /e/（如将 bad 念成 bed，man 念成 men）。',
    matcher: (w: string) =>
      /\ba[t|n|d|m|p|s|k|g|x|c]/i.test(w) || /can|man|plan|back|fact|ask|last|stand|track|action/i.test(w),
    commonError: '开口度不足，发成了短元音 /e/',
    correctionTip: (w: string) => `"${w}" 含有梅花音 /æ/，下巴一定要大幅下沉，开口到三指宽！`,
  },
  {
    id: 'dark-l',
    type: '舌侧音',
    title: '暗音 /ɫ/ (Dark L)',
    symbol: '/ɫ/',
    explanation:
      '位于词尾或辅音前的 l（fellow, all, will, world, people）属于 Dark L。舌后部向软腭抬起，发出深沉的喉底音。',
    correctionGuide:
      '切忌简单读成汉语的"欧"或者丢掉尾音。舌尖顶住上齿龈，舌根后缩抬高。',
    matcher: (w: string) => /ll|ld|lt|lk|le\b/i.test(w) || /[a-z]+l\b/i.test(w),
    commonError: '直接读成中文"欧"或者省略尾音 l',
    correctionTip: (w: string) => `"${w}" 的 l 处于音节尾部，注意发出饱满的 Dark L 舌根后缩音。`,
  },
  {
    id: 'unreleased-stops',
    type: '失去爆破与不完全爆破',
    title: '失去爆破 (Unreleased Stops)',
    symbol: '/p, t, k, b, d, g/',
    explanation:
      '当爆破音后接另一辅音时，只做发音口型（阻住气流）而不产生爆破气流，直接滑向下一音。',
    correctionGuide:
      '例如 ask not（/k/ 闭气停顿，不爆破）、what your（/t/ 弱化或同化），不能把每个尾辅音都重读出来。',
    matcher: (w: string) => /[ptkbdg]$/i.test(w),
    commonError: '在尾辅音后加生硬的"得"、"特"元音',
    correctionTip: (w: string) => `"${w}" 句末或接辅音时，尾音只需闭气阻流，切勿加读多余元音！`,
  },
];

const COMMON_IPA_DICT: Record<string, string> = {
  the: 'ðə',
  and: 'ænd',
  to: 'tuː',
  of: 'əv',
  a: 'ə',
  in: 'ɪn',
  that: 'ðæt',
  is: 'ɪz',
  was: 'wɒz',
  he: 'hiː',
  for: 'fɔːr',
  it: 'ɪt',
  with: 'wɪð',
  as: 'æz',
  his: 'hɪz',
  on: 'ɒn',
  be: 'biː',
  at: 'æt',
  by: 'baɪ',
  i: 'aɪ',
  this: 'ðɪs',
  have: 'hæv',
  from: 'frɒm',
  or: 'ɔːr',
  one: 'wʌn',
  had: 'hæd',
  word: 'wɜːrd',
  but: 'bʌt',
  not: 'nɒt',
  what: 'wɒt',
  all: 'ɔːl',
  were: 'wɜːr',
  we: 'wiː',
  when: 'wen',
  your: 'jɔːr',
  can: 'kæn',
  said: 'sed',
  there: 'ðeər',
  use: 'juːz',
  each: 'iːtʃ',
  which: 'wɪtʃ',
  she: 'ʃiː',
  do: 'duː',
  how: 'haʊ',
  their: 'ðeər',
  if: 'ɪf',
  will: 'wɪl',
  up: 'ʌp',
  other: 'ˈʌð.ər',
  about: 'əˈbaʊt',
  out: 'aʊt',
  many: 'ˈmen.i',
  then: 'ðen',
  them: 'ðem',
  these: 'ðiːz',
  so: 'soʊ',
  some: 'sʌm',
  her: 'hɜːr',
  would: 'wʊd',
  make: 'meɪk',
  like: 'laɪk',
  him: 'hɪm',
  into: 'ˈɪn.tuː',
  time: 'taɪm',
  has: 'hæz',
  look: 'lʊk',
  two: 'tuː',
  more: 'mɔːr',
  write: 'raɪt',
  go: 'ɡoʊ',
  see: 'siː',
  number: 'ˈnʌm.bər',
  no: 'noʊ',
  way: 'weɪ',
  could: 'kʊd',
  people: 'ˈpiː.pəl',
  my: 'maɪ',
  than: 'ðæn',
  first: 'fɜːrst',
  water: 'ˈwɔː.tər',
  been: 'biːn',
  call: 'kɔːl',
  who: 'huː',
  oil: 'ɔɪl',
  its: 'ɪts',
  now: 'naʊ',
  find: 'faɪnd',
  country: 'ˈkʌn.tri',
  fellow: 'ˈfel.oʊ',
  americans: 'əˈmer.ɪ.kənz',
  ask: 'æsk',
  think: 'θɪŋk',
  thank: 'θæŋk',
  three: 'θriː',
  through: 'θruː',
  together: 'təˈɡeð.ər',
  weather: 'ˈweð.ər',
  very: 'ˈver.i',
  voice: 'vɔɪs',
  world: 'wɜːrld',
  coffee: 'ˈkɒf.i',
  weekend: 'ˈwiːk.end',
  store: 'stɔːr',
  along: 'əˈlɒŋ',
  minute: 'ˈmɪn.ɪt',
  practice: 'ˈpræk.tɪs',
  speaking: 'ˈspiː.kɪŋ',
  english: 'ˈɪŋ.ɡlɪʃ',
};

export function getClientIPA(word: string): string {
  const clean = word.toLowerCase().replace(/[^a-z']/g, '');
  if (COMMON_IPA_DICT[clean]) return COMMON_IPA_DICT[clean];
  return `/${clean}/`;
}

/**
 * Generates a full document pronunciation and phonetic error-correction report
 */
export function generateClientDocumentReport(sentences: SentenceItem[]): DocumentPronunciationReport {
  const allWords: string[] = [];
  const wordFreq: Record<string, number> = {};

  sentences.forEach((s) => {
    const words = s.text
      .replace(/[^\w\s']/g, '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    words.forEach((w) => {
      allWords.push(w);
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
  });

  const totalWords = allWords.length;
  const uniqueWords = Object.keys(wordFreq).length;
  const totalDuration =
    sentences.length > 0 ? sentences[sentences.length - 1].endTime - sentences[0].startTime : 15;
  const estCadenceWPM =
    totalDuration > 0 ? Math.round((totalWords / totalDuration) * 60) : 135;

  let overallDifficulty: 'A2 初级' | 'B1 进阶' | 'B2 中高级' | 'C1 熟练' = 'B1 进阶';
  if (estCadenceWPM > 160 || uniqueWords > 120) {
    overallDifficulty = 'B2 中高级';
  } else if (estCadenceWPM < 110 && uniqueWords < 40) {
    overallDifficulty = 'A2 初级';
  }

  // Scan for phonetic traps
  const traps: PhoneticTrap[] = CLIENT_PHONETIC_TRAPS.map((trapDef) => {
    const examples: any[] = [];
    let count = 0;

    sentences.forEach((s) => {
      const words = s.text
        .replace(/[^\w\s']/g, '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      words.forEach((w) => {
        if (trapDef.matcher(w)) {
          count++;
          if (examples.length < 5 && !examples.some((e) => e.word === w)) {
            examples.push({
              word: w,
              sentenceIdx: s.index,
              context: s.text,
              ipa: getClientIPA(w),
              commonError: trapDef.commonError,
              correctionTip: trapDef.correctionTip(w),
            });
          }
        }
      });
    });

    return {
      id: trapDef.id,
      type: trapDef.type,
      title: trapDef.title,
      symbol: trapDef.symbol,
      count,
      explanation: trapDef.explanation,
      correctionGuide: trapDef.correctionGuide,
      examples,
    };
  }).filter((t) => t.count > 0);

  // Extract linking patterns across document
  const linkingList: Array<{
    phrase: string;
    naturalPronunciation: string;
    explanation: string;
    sentenceIdx: number;
  }> = [];

  sentences.forEach((s) => {
    if (s.linkingTip) {
      linkingList.push({
        phrase: s.linkingTip.phrase,
        naturalPronunciation: s.linkingTip.naturalPronunciation,
        explanation: s.linkingTip.explanation,
        sentenceIdx: s.index,
      });
    }
  });

  // Top distinct words with phonetic tips
  const sortedWords = Object.entries(wordFreq)
    .filter(([w]) => w.length > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16);

  const allWordsPhoneticList: WordPhoneticItem[] = sortedWords.map(([w, cnt]) => {
    const hitTrap = CLIENT_PHONETIC_TRAPS.find((t) => t.matcher(w));
    return {
      word: w,
      ipa: getClientIPA(w),
      count: cnt,
      trapType: hitTrap?.type,
      commonError: hitTrap?.commonError,
      tip: hitTrap ? hitTrap.correctionTip(w) : '注意元音饱满与清晰重音',
    };
  });

  const summaryDiagnosis = `全文共识别 ${sentences.length} 个自然句子、${totalWords} 个单词（${uniqueWords} 个不重复词汇）。文档平均语速约 ${estCadenceWPM} WPM，适合日常精听与影子跟读训练。重点发音难点集中在【${
    traps[0]?.title || '元音饱满度'
  }】与【${traps[1]?.title || '连读弱读'}】。`;

  const recommendedFocus = [
    `1. 掌握咬舌与唇齿口型规范：遇到 th、v、w 时有意识放慢 0.5 秒到位`,
    `2. 运用意群自然停顿：在标点与连词处自然吸气，不要在单词中间突兀停顿`,
    `3. 模仿连读弱读音律：把虚词 to、for、and 弱读成轻声，突出核心名词与动词`,
  ];

  return {
    overallDifficulty,
    totalWords,
    uniqueWords,
    estCadenceWPM,
    phoneticTrapsCount: traps.reduce((acc, t) => acc + t.count, 0),
    linkingCount: linkingList.length,
    traps,
    linkingList,
    allWordsPhoneticList,
    summaryDiagnosis,
    recommendedFocus,
  };
}
