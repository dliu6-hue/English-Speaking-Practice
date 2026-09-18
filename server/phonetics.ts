/**
 * English Phonetics & Connected Speech Analyzer
 * Provides phonetic guidance, IPA, natural reductions, and translation
 */

export interface LinkingTip {
  phrase: string;
  naturalPronunciation: string;
  explanation: string;
}

// Common conversational reductions & contractions in spoken English
const REDUCTION_PATTERNS: Array<{
  regex: RegExp;
  phrase: string;
  naturalPronunciation: string;
  explanation: string;
}> = [
  {
    regex: /\bwhat\s+are\s+you\b/i,
    phrase: 'What are you',
    naturalPronunciation: 'Whaddaya /ˈwɒdəjə/',
    explanation: '在自然口语中，"What are you" 连读且元音弱化，/t/ 浊化为类似闪音 /d/。',
  },
  {
    regex: /\bwhat\s+do\s+you\b/i,
    phrase: 'What do you',
    naturalPronunciation: 'Whaddaya /ˈwʌdəjə/',
    explanation: '"What do you" 连贯发音时，辅音连带弱读，常缩合为连贯轻快的 /wʌdəjə/。',
  },
  {
    regex: /\bwant\s+to\b/i,
    phrase: 'want to',
    naturalPronunciation: 'wanna /ˈwɒnə/',
    explanation: '辅音 /t/ 与后方 "to" 同化脱落，弱化为连贯的双音节 wanna。',
  },
  {
    regex: /\bgoing\s+to\b/i,
    phrase: 'going to',
    naturalPronunciation: 'gonna /ˈɡɒnə/ or /ˈɡənə/',
    explanation: '口语中作为将来时助动词时，高度弱读并缩合为 gonna，语速更快更自然。',
  },
  {
    regex: /\bgot\s+to\b/i,
    phrase: 'got to',
    naturalPronunciation: 'gotta /ˈɡɒtə/',
    explanation: '末尾爆破音失去爆破，与 "to" 弱化音节连读为 gotta。',
  },
  {
    regex: /\bhave\s+to\b/i,
    phrase: 'have to',
    naturalPronunciation: 'hafta /ˈhæftə/',
    explanation: '浊辅音 /v/ 在清辅音 /t/ 影响下清化为 /f/，"to" 弱读为 /tə/。',
  },
  {
    regex: /\bhas\s+to\b/i,
    phrase: 'has to',
    naturalPronunciation: 'hasta /ˈhæstə/',
    explanation: '词尾 /z/ 在清辅音 /t/ 影响下清化为 /s/，顺畅过渡。',
  },
  {
    regex: /\bdid\s+you\b/i,
    phrase: 'did you',
    naturalPronunciation: 'didja /ˈdɪdʒə/',
    explanation: '辅音 /d/ 与后方半元音 /j/ 发生同化（Palatalization），合为一个类似 /dʒ/ 的声音。',
  },
  {
    regex: /\bwould\s+you\b/i,
    phrase: 'would you',
    naturalPronunciation: 'wouldja /ˈwʊdʒə/',
    explanation: '辅音 /d/ 与 /j/ 结合发生同化连读，读作 /dʒə/。',
  },
  {
    regex: /\bcould\s+you\b/i,
    phrase: 'could you',
    naturalPronunciation: 'couldja /ˈkʊdʒə/',
    explanation: '/d/ 与 /j/ 顺势同化为 /dʒ/，发音轻巧省力。',
  },
  {
    regex: /\blet\s+me\b/i,
    phrase: 'let me',
    naturalPronunciation: 'lemme /ˈlɛmi/',
    explanation: '爆破音 /t/ 被鼻音 /m/ 完全同化吸收，形成自然口语连音 lemme。',
  },
  {
    regex: /\bgive\s+me\b/i,
    phrase: 'give me',
    naturalPronunciation: 'gimme /ˈɡɪmi/',
    explanation: '摩擦音 /v/ 被鼻音 /m/ 同化，口语中频繁读作 gimme。',
  },
  {
    regex: /\bkind\s+of\b/i,
    phrase: 'kind of',
    naturalPronunciation: 'kinda /ˈkaɪndə/',
    explanation: '"of" 弱读为 /əv/，词尾辅音脱落后缩合为 kinda。',
  },
  {
    regex: /\bsort\s+of\b/i,
    phrase: 'sort of',
    naturalPronunciation: 'sorta /ˈsɔːrtə/',
    explanation: '"of" 弱读并融合，结尾脱落，读作轻快柔和的 sorta。',
  },
  {
    regex: /\bout\s+of\b/i,
    phrase: 'out of',
    naturalPronunciation: 'outta /ˈaʊtə/',
    explanation: '"out" 与 "of" 连读，/t/ 弱化闪音化为 outta。',
  },
  {
    regex: /\ba\s+lot\s+of\b/i,
    phrase: 'a lot of',
    naturalPronunciation: 'alotta /ə ˈlɒtə/',
    explanation: '三个词连贯一口气读出，重音落在 lot 上，of 弱化为短元音 /ə/。',
  },
  {
    regex: /\bdon't\s+know\b/i,
    phrase: "don't know",
    naturalPronunciation: 'dunno /dəˈnoʊ/',
    explanation: '爆破音 /t/ 省略，鼻音重叠弱化，口语极常缩写发音为 dunno。',
  },
];

// IPA phonetics map for key common English words
const WORD_IPA_MAP: Record<string, string> = {
  the: '/ðə/',
  be: '/biː/',
  to: '/tə/',
  of: '/əv/',
  and: '/ənd/',
  a: '/ə/',
  in: '/ɪn/',
  that: '/ðæt/',
  have: '/hæv/',
  i: '/aɪ/',
  it: '/ɪt/',
  for: '/fər/',
  not: '/nɒt/',
  on: '/ɒn/',
  with: '/wɪð/',
  he: '/hiː/',
  as: '/æz/',
  you: '/juː/',
  do: '/duː/',
  at: '/æt/',
  this: '/ðɪs/',
  but: '/bʌt/',
  his: '/hɪz/',
  by: '/baɪ/',
  from: '/frɒm/',
  they: '/ðeɪ/',
  we: '/wiː/',
  say: '/seɪ/',
  her: '/hɜːr/',
  she: '/ʃiː/',
  or: '/ɔːr/',
  an: '/ən/',
  will: '/wɪl/',
  my: '/maɪ/',
  one: '/wʌn/',
  all: '/ɔːl/',
  would: '/wʊd/',
  there: '/ðeər/',
  their: '/ðeər/',
  what: '/wɒt/',
  so: '/soʊ/',
  up: '/ʌp/',
  out: '/aʊt/',
  if: '/ɪf/',
  about: '/əˈbaʊt/',
  who: '/huː/',
  get: '/ɡet/',
  which: '/wɪtʃ/',
  go: '/ɡoʊ/',
  me: '/miː/',
  when: '/wen/',
  make: '/meɪk/',
  can: '/kən/',
  like: '/laɪk/',
  time: '/taɪm/',
  no: '/noʊ/',
  just: '/dʒʌst/',
  him: '/hɪm/',
  know: '/noʊ/',
  take: '/teɪk/',
  people: '/ˈpiːpl/',
  into: '/ˈɪntuː/',
  year: '/jɪər/',
  your: '/jɔːr/',
  good: '/ɡʊd/',
  some: '/sʌm/',
  could: '/kʊd/',
  them: '/ðəm/',
  see: '/siː/',
  other: '/ˈʌðər/',
  than: '/ðən/',
  then: '/ðen/',
  now: '/naʊ/',
  look: '/lʊk/',
  only: '/ˈoʊnli/',
  come: '/kʌm/',
  its: '/ɪts/',
  over: '/ˈoʊvər/',
  think: '/θɪŋk/',
  also: '/ˈɔːlsoʊ/',
  back: '/bæk/',
  after: '/ˈæftər/',
  use: '/juːz/',
  two: '/tuː/',
  how: '/haʊ/',
  our: '/aʊər/',
  work: '/wɜːrk/',
  first: '/fɜːrst/',
  well: '/wel/',
  way: '/weɪ/',
  even: '/ˈiːvn/',
  new: '/njuː/',
  want: '/wɒnt/',
  because: '/bɪˈkɒz/',
  any: '/ˈeni/',
  these: '/ðiːz/',
  give: '/ɡɪv/',
  day: '/deɪ/',
  most: '/moʊst/',
  us: '/ʌs/',
  great: '/ɡreɪt/',
  hello: '/həˈloʊ/',
  welcome: '/ˈwelkəm/',
  english: '/ˈɪŋɡlɪʃ/',
  speaking: '/ˈspiːkɪŋ/',
  practice: '/ˈpræktɪs/',
  today: '/təˈdeɪ/',
  world: '/wɜːrld/',
  talk: '/tɔːk/',
  video: '/ˈvɪdioʊ/',
  audio: '/ˈɔːdioʊ/',
  learning: '/ˈlɜːrnɪŋ/',
  conversation: '/ˌkɒnvərˈseɪʃn/',
  podcast: '/ˈpɒdkæst/',
  language: '/ˈlæŋɡwɪdʒ/',
  country: '/ˈkʌntri/',
  americans: '/əˈmerɪkənz/',
  american: '/əˈmerɪkən/',
  fellow: '/ˈfeloʊ/',
  ask: '/æsk/',
  listen: '/ˈlɪsn/',
  speak: '/spiːk/',
  read: '/riːd/',
  write: '/raɪt/',
  thought: '/θɔːt/',
  through: '/θruː/',
  three: '/θriː/',
  thing: '/θɪŋ/',
  thanks: '/θæŋks/',
  thank: '/θæŋk/',
  those: '/ðoʊz/',
  another: '/əˈnʌðər/',
  brother: '/ˈbrʌðər/',
  mother: '/ˈmʌðər/',
  father: '/ˈfɑːðər/',
  together: '/təˈɡeðər/',
  weather: '/ˈweðər/',
  whether: '/ˈweðər/',
  without: '/wɪˈðaʊt/',
  within: '/wɪˈðɪn/',
  very: '/ˈveri/',
  every: '/ˈevri/',
  never: '/ˈnevər/',
  ever: '/ˈevər/',
  live: '/lɪv/',
  love: '/lʌv/',
  leave: '/liːv/',
  life: '/laɪf/',
  view: '/vjuː/',
  voice: '/vɔɪs/',
  visit: '/ˈvɪzɪt/',
  value: '/ˈvæljuː/',
  various: '/ˈveəriəs/',
  water: '/ˈwɔːtər/',
  word: '/wɜːrd/',
  where: '/weər/',
  while: '/waɪl/',
  white: '/waɪt/',
  whole: '/hoʊl/',
  whose: '/huːz/',
  why: '/waɪ/',
  right: '/raɪt/',
  really: '/ˈriːəli/',
  real: '/ˈriːəl/',
  reach: '/riːtʃ/',
  rich: '/rɪtʃ/',
  ship: '/ʃɪp/',
  sheep: '/ʃiːp/',
  seat: '/siːt/',
  sit: '/sɪt/',
  feel: '/fiːl/',
  fill: '/fɪl/',
  beat: '/biːt/',
  bit: '/bɪt/',
  sleep: '/sliːp/',
  slip: '/slɪp/',
  heat: '/hiːt/',
  hit: '/hɪt/',
  bad: '/bæd/',
  bed: '/bed/',
  man: '/mæn/',
  men: '/men/',
  pan: '/pæn/',
  pen: '/pen/',
  head: '/hed/',
  hand: '/hænd/',
  stand: '/stænd/',
  plan: '/plæn/',
  family: '/ˈfæməli/',
  happy: '/ˈhæpi/',
  matter: '/ˈmætər/',
  important: '/ɪmˈpɔːrtnt/',
  different: '/ˈdɪfrənt/',
  difficult: '/ˈdɪfɪkəlt/',
  student: '/ˈstjuːdnt/',
  school: '/skuːl/',
  place: '/pleɪs/',
  number: '/ˈnʌmbər/',
  part: '/pɑːrt/',
  help: '/help/',
  turn: '/tɜːrn/',
  start: '/stɑːrt/',
  show: '/ʃoʊ/',
  hear: '/hɪər/',
  play: '/pleɪ/',
  run: '/rʌn/',
  move: '/muːv/',
  believe: '/bɪˈliːv/',
  hold: '/hoʊld/',
  bring: '/brɪŋ/',
  happen: '/ˈhæpən/',
  must: '/mʌst/',
  provide: '/prəˈvaɪd/',
  lose: '/luːz/',
  pay: '/peɪ/',
  meet: '/miːt/',
  include: '/ɪnˈkluːd/',
  continue: '/kənˈtɪnjuː/',
  set: '/set/',
  learn: '/lɜːrn/',
  change: '/tʃeɪndʒ/',
  lead: '/liːd/',
  understand: '/ˌʌndərˈstænd/',
  watch: '/wɒtʃ/',
  follow: '/ˈfɒloʊ/',
  stop: '/stɒp/',
  create: '/kriˈeɪt/',
  allow: '/əˈlaʊ/',
  add: '/æd/',
  spend: '/spend/',
  grow: '/ɡroʊ/',
  open: '/ˈoʊpən/',
  walk: '/wɔːk/',
  win: '/wɪn/',
  offer: '/ˈɒfər/',
  remember: '/rɪˈmembər/',
  consider: '/kənˈsɪdər/',
  appear: '/əˈpɪər/',
  buy: '/baɪ/',
  wait: '/weɪt/',
  serve: '/sɜːrv/',
  die: '/daɪ/',
  send: '/send/',
  expect: '/ɪkˈspekt/',
  build: '/bɪld/',
  stay: '/steɪ/',
  fall: '/fɔːl/',
  cut: '/kʌt/',
  kill: '/kɪl/',
  remain: '/rɪˈmeɪn/',
};

export function getWordIPA(word: string): string {
  const clean = word.toLowerCase().replace(/[^a-z']/g, '');
  if (WORD_IPA_MAP[clean]) return WORD_IPA_MAP[clean];
  
  // Rule-based estimation for unlisted words
  let ipa = clean;
  ipa = ipa.replace(/tion/g, 'ʃn').replace(/sion/g, 'ʒn');
  ipa = ipa.replace(/th/g, 'θ');
  ipa = ipa.replace(/sh/g, 'ʃ');
  ipa = ipa.replace(/ch/g, 'tʃ');
  ipa = ipa.replace(/ph/g, 'f');
  ipa = ipa.replace(/ee|ea/g, 'iː');
  ipa = ipa.replace(/oo/g, 'uː');
  ipa = ipa.replace(/ou|ow/g, 'aʊ');
  ipa = ipa.replace(/ai|ay/g, 'eɪ');
  ipa = ipa.replace(/oi|oy/g, 'ɔɪ');
  return `/${ipa}/`;
}

export interface PhoneticTrapDefinition {
  id: string;
  type: string;
  title: string;
  symbol: string;
  matcher: (word: string) => boolean;
  explanation: string;
  correctionGuide: string;
  commonError: string;
  correctionTip: (word: string) => string;
}

export const PHONETIC_TRAPS: PhoneticTrapDefinition[] = [
  {
    id: 'dental_fricative_th',
    type: 'consonant_fricative',
    title: '咬舌齿间音',
    symbol: '/θ/ & /ð/',
    matcher: (w) => /\bth|th\b|the|this|that|think|with|through|other|fellow/i.test(w),
    explanation: '英语中独特的齿间摩擦音，汉语拼音中无对等音。中国学习者最容易读成普通的齿龈擦音 /s/ 或 /z/。',
    correctionGuide: '舌尖必须微微伸出上下门齿之间，上下牙齿轻触舌尖，让气流从舌齿缝隙中柔和摩擦挤出，不可直接咬紧牙关发成 /s/。',
    commonError: '容易发成 /s/ 或 /z/ (如 think 读成 sink，that 读成 zat)',
    correctionTip: (w) => `"${w}" 中含有齿间音，请将舌尖轻探出上下齿间，轻柔摩擦，严防缩舌读成普通 s/z。`,
  },
  {
    id: 'labiodental_v_vs_w',
    type: 'consonant_glide',
    title: '唇齿摩擦音 vs 双唇半元音',
    symbol: '/v/ vs /w/',
    matcher: (w) => /\bv|video|very|view|voice|value|never|every|give|have/i.test(w),
    explanation: '/v/ 是唇齿音，上门牙轻触下嘴唇内侧摩擦；而 /w/ 是双唇拢圆音，两者混淆会导致语音严重失真。',
    correctionGuide: '发 /v/ 时，上排牙齿必须落在下嘴唇内缘产生阻碍，同时声带用力振动。切勿将嘴唇完全拢圆读成了 /w/。',
    commonError: '容易发成双唇音 /w/ (如 very 读成 wary，video 读成 wideo)',
    correctionTip: (w) => `"${w}" 发 /v/ 时，上门齿轻触下唇内缘摩擦出声，声带保持振动。`,
  },
  {
    id: 'vowel_tense_lax_i',
    type: 'vowel_pair',
    title: '易混长短元音：紧音 /iː/ vs 松音 /ɪ/',
    symbol: '/iː/ vs /ɪ/',
    matcher: (w) => /\b(it|is|in|if|this|with|which|will|him|his|give|live|ship|sit|fit|each|see|we|be|feel|leave)\b/i.test(w),
    explanation: '英语区分紧元音（长元音 /iː/）与松元音（短元音 /ɪ/）。/ɪ/ 不是把“衣”缩短，而是口腔自然松弛下垂的半开音。',
    correctionGuide: '发 /iː/ 时嘴角肌肉向两边紧绷展开（如微笑）；发 /ɪ/ 时下巴微微放松自然下垂，舌身微降，声音短促松弛。',
    commonError: '将短元音 /ɪ/ 读成中文尖锐的“一”，导致与 /iː/ 无法区分',
    correctionTip: (w) => `"${w}" 中注意元音松紧度，保持口腔肌肉松弛短促或充分延展微笑。`,
  },
  {
    id: 'vowel_ash_ae',
    type: 'vowel_open',
    title: '梅花大开口音',
    symbol: '/æ/ (Ash)',
    matcher: (w) => /\b(ask|and|can|that|have|man|bad|back|hand|stand|matter|family|action)\b/i.test(w),
    explanation: '/æ/ 是英语中开口度最大的前元音。非母语者常因开口幅度不足，将其误发为较窄的 /e/。',
    correctionGuide: '下颌大幅下沉放松，上下齿之间保持约三指宽度，嘴角两侧展开，舌尖紧抵下齿根，发出饱满有力的短音。',
    commonError: '嘴张得太小，读成小开口的 /e/ (如 bad 读成 bed，pan 读成 pen)',
    correctionTip: (w) => `"${w}" 中的 /æ/ 需下巴大幅放松下垂，张大嘴部，舌尖抵住下门牙。`,
  },
  {
    id: 'unreleased_stop',
    type: 'stop_consonant',
    title: '失去爆破与辅音连缀',
    symbol: 'Unreleased Stop [p̚ t̚ k̚ b̚ d̚ ɡ̚]',
    matcher: (w) => /(ct|kt|pt|sk|st|ft|nt|ld|country|ask|not|what|fact|act|accept|doctor)/i.test(w),
    explanation: '当爆破音 /p, t, k, b, d, g/ 紧随另一个辅音时，该爆破音做出阻碍口型后瞬间闭气停顿，不释放爆破气流。',
    correctionGuide: '舌头或嘴唇立刻到达发音部位阻住气流，保持 0.1 秒的无声静止，直接过渡到下一个辅音，绝不可多读出一个 /ə/ 音节（如 not 读成 not-uh）。',
    commonError: '爆破过重，词尾多出一个元音音节 (如 ask-uh, not-uh)',
    correctionTip: (w) => `"${w}" 的词尾爆破音做出口型闭气即可，立即过渡，严防多加 "-uh" 尾音。`,
  },
  {
    id: 'weak_forms',
    type: 'reduction',
    title: '虚词弱读与央元音 /ə/',
    symbol: 'Weak Form /ə/',
    matcher: (w) => /\b(for|can|you|to|of|and|that|from|at|as|are)\b/i.test(w),
    explanation: '英语是重音计时语言 (Stress-timed)。功能虚词在自然连贯语流中必须高度弱读，元音弱化为短弱的中央元音 /ə/。',
    correctionGuide: '不要把 for 读成重读的 /fɔːr/，弱读成轻快的 /fər/；can 弱读为 /kən/；to 弱读为 /tə/，为实词留出重音时间。',
    commonError: '逐字字字重读，没有轻重交替，失去英语如波浪起伏的音乐节奏感',
    correctionTip: (w) => `"${w}" 作为虚词应轻巧带过，元音弱化为 /ə/，将重音让给相邻的实词。`,
  },
];

/**
 * Generates a comprehensive pronunciation diagnosis & scoring report for the entire document
 */
export function generateDocumentPronunciationReport(
  sentences: Array<{ index: number; text: string; startTime: number; endTime: number }>
) {
  const allWords: Array<{ word: string; sIdx: number; clean: string }> = [];
  const wordFreqMap = new Map<string, number>();

  sentences.forEach((s) => {
    const tokens = s.text.replace(/[^\w\s']/g, '').split(/\s+/).filter(Boolean);
    tokens.forEach((t) => {
      const clean = t.toLowerCase();
      if (clean.length > 0) {
        allWords.push({ word: t, sIdx: s.index, clean });
        wordFreqMap.set(clean, (wordFreqMap.get(clean) || 0) + 1);
      }
    });
  });

  const totalWords = allWords.length;
  const uniqueWords = wordFreqMap.size;

  // Calculate difficulty
  let overallDifficulty: 'A2 初级' | 'B1 进阶' | 'B2 中高级' | 'C1 熟练' = 'B1 进阶';
  if (totalWords > 120 || uniqueWords > 70) {
    overallDifficulty = 'B2 中高级';
  } else if (totalWords < 30) {
    overallDifficulty = 'A2 初级';
  }

  // Calculate estimated cadence
  const totalDuration = sentences.length > 0
    ? Math.max(5, sentences[sentences.length - 1].endTime - sentences[0].startTime)
    : 15;
  const estCadenceWPM = Math.round((totalWords / (totalDuration / 60)) || 135);

  // Match Phonetic Traps across document
  const trapResults: Array<{
    id: string;
    type: string;
    title: string;
    symbol: string;
    count: number;
    explanation: string;
    correctionGuide: string;
    examples: Array<{
      word: string;
      sentenceIdx: number;
      context: string;
      ipa: string;
      commonError: string;
      correctionTip: string;
    }>;
  }> = [];

  for (const trapDef of PHONETIC_TRAPS) {
    const matchedExamples: Array<{
      word: string;
      sentenceIdx: number;
      context: string;
      ipa: string;
      commonError: string;
      correctionTip: string;
    }> = [];

    allWords.forEach((item) => {
      if (trapDef.matcher(item.clean)) {
        const sentence = sentences.find((s) => s.index === item.sIdx);
        if (sentence && matchedExamples.length < 6) {
          // Avoid duplicate words in same trap examples
          const already = matchedExamples.some((m) => m.word.toLowerCase() === item.clean);
          if (!already) {
            matchedExamples.push({
              word: item.word,
              sentenceIdx: item.sIdx,
              context: sentence.text,
              ipa: getWordIPA(item.clean),
              commonError: trapDef.commonError,
              correctionTip: trapDef.correctionTip(item.word),
            });
          }
        }
      }
    });

    if (matchedExamples.length > 0) {
      trapResults.push({
        id: trapDef.id,
        type: trapDef.type,
        title: trapDef.title,
        symbol: trapDef.symbol,
        count: matchedExamples.length,
        explanation: trapDef.explanation,
        correctionGuide: trapDef.correctionGuide,
        examples: matchedExamples,
      });
    }
  }

  // Collect all linking phrases across sentences
  const linkingList: Array<{
    phrase: string;
    naturalPronunciation: string;
    explanation: string;
    sentenceIdx: number;
  }> = [];

  sentences.forEach((s) => {
    const tip = analyzeLinking(s.text);
    if (tip) {
      linkingList.push({
        ...tip,
        sentenceIdx: s.index,
      });
    }
  });

  // Build sorted vocabulary phonetic table with IPA
  const sortedWords = Array.from(wordFreqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  const allWordsPhoneticList = sortedWords.map(([w, count]) => {
    const ipa = getWordIPA(w);
    let commonError: string | undefined = undefined;
    let tip: string | undefined = undefined;
    
    // Check if word hits a trap
    const hitTrap = PHONETIC_TRAPS.find((t) => t.matcher(w));
    if (hitTrap) {
      commonError = hitTrap.commonError;
      tip = hitTrap.correctionTip(w);
    }

    return {
      word: w,
      ipa,
      count,
      trapType: hitTrap?.title,
      commonError,
      tip,
    };
  });

  // Summary diagnosis
  const summaryDiagnosis = `本文档共识别到 ${sentences.length} 处完整句子，总计 ${totalWords} 词（去重词汇 ${uniqueWords} 个）。预估常速语速约为 ${estCadenceWPM} WPM。发音难点集中在：${trapResults.map((t) => t.title).join('、')}。建议在跟读前重点攻关文中的咬舌齿间音与辅音连读规律。`;

  const recommendedFocus = [
    `严把咬舌关：识别出 ${allWords.filter(w => /th/i.test(w.clean)).length} 处含 "th" 的词汇，跟读时务必使舌尖轻出上下齿。`,
    `虚词弱化：注意冠词、连词和介词的短促弱读，避免字字平均用力。`,
    `意群呼吸节奏：在逗号与连词处留出 0.3s 微停顿，让语流如波浪起伏。`,
  ];

  return {
    overallDifficulty,
    totalWords,
    uniqueWords,
    estCadenceWPM,
    phoneticTrapsCount: trapResults.reduce((acc, t) => acc + t.count, 0),
    linkingCount: linkingList.length,
    traps: trapResults,
    linkingList,
    allWordsPhoneticList,
    summaryDiagnosis,
    recommendedFocus,
  };
}

/**
 * Detects natural linking tips (Connected Speech) for a given sentence
 */
export function analyzeLinking(text: string): LinkingTip | undefined {
  // 1. Check known contraction / reduction patterns
  for (const item of REDUCTION_PATTERNS) {
    if (item.regex.test(text)) {
      return {
        phrase: item.phrase,
        naturalPronunciation: item.naturalPronunciation,
        explanation: item.explanation,
      };
    }
  }

  // 2. Check consonant-to-vowel linking between adjacent words
  const words = text
    .replace(/[^\w\s']/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const vowels = new Set(['a', 'e', 'i', 'o', 'u']);

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i].toLowerCase();
    const next = words[i + 1].toLowerCase();

    const lastChar = current.slice(-1);
    const firstChar = next[0];

    // Consonant at end of word1, vowel at start of word2
    if (!vowels.has(lastChar) && vowels.has(firstChar) && current.length > 1) {
      return {
        phrase: `${words[i]} ${words[i + 1]}`,
        naturalPronunciation: `${words[i]}-${words[i + 1]}`,
        explanation: `词尾辅音 /${lastChar}/ 与后一个词的起始元音 /${firstChar}/ 自然连缀滑过，避免刻意顿挫。`,
      };
    }
  }

  return undefined;
}

/**
 * Generates a phonetic hint for the sentence
 */
export function generatePhoneticHint(text: string): string {
  const clean = text.trim();
  if (clean.endsWith('?')) {
    if (/^(do|did|is|are|can|could|would|will|have|has)\b/i.test(clean)) {
      return '一般疑问句语调：句尾通常使用轻柔的升调 (Rising intonation ↑)';
    }
    return '特殊疑问句语调：句首疑问词重读，句尾自然转为平降调 (Falling intonation ↓)';
  }

  if (/\b(and|or|but|because|so)\b/i.test(clean)) {
    return '并列复合句节奏：在连词前做极微小的意群停顿 (sense group pause)，突出核心动词与名词重音';
  }

  return '意群重音：保持句中实词（名词、动词、形容词）饱满发音，虚词（代词、介词、冠词）轻柔弱读';
}

/**
 * Translate English text to Simplified Chinese
 */
export async function translateText(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      trimmed
    )}&langpair=en|zh-CN`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (
        translated &&
        typeof translated === 'string' &&
        !translated.includes('MYMEMORY WARNING') &&
        !translated.includes('QUERY LENGTH LIMIT')
      ) {
        return cleanTranslation(translated);
      }
    }
  } catch (err) {
    // Network or timeout, fallback to basic dictionary
  }

  return fallbackTranslate(trimmed);
}

function cleanTranslation(raw: string): string {
  return raw
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function fallbackTranslate(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('what are you doing')) return '你正在做什么？';
  if (lower.includes('how are you')) return '你今天过得怎么样？';
  if (lower.includes('welcome to')) return '欢迎来到这里。';
  if (lower.includes('thank you')) return '非常感谢你。';
  if (lower.includes('nice to meet you')) return '很高兴认识你。';
  if (lower.includes('good morning')) return '早上好。';
  return text; // return original if no translation available
}
