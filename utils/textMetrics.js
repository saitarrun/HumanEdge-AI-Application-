// Simple, dependency-free metrics and helpers (readability, variance, repetition, passive voice, similarity)
export function sentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length);
}
export function words(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}
export function fleschReadingEase(text) {
  const sents = sentences(text);
  const w = words(text);
  if (w.length === 0 || sents.length === 0) return 0;
  const syllables = w.reduce((acc, wd) => acc + countSyllables(wd), 0);
  const ASL = w.length / sents.length;
  const ASW = syllables / w.length;
  return Math.round(206.835 - (1.015 * ASL) - (84.6 * ASW));
}
function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const vowels = 'aeiouy';
  let count = 0;
  let prevVowel = false;
  for (let i=0; i<w.length; i++) {
    const isV = vowels.includes(w[i]);
    if (isV && !prevVowel) count++;
    prevVowel = isV;
  }
  if (w.endsWith('e')) count = Math.max(1, count - 1);
  return Math.max(count, 1);
}
export function sentenceLengthStats(text) {
  const s = sentences(text);
  const lens = s.map(x => words(x).length);
  if (lens.length === 0) return { mean:0, stdev:0 };
  const mean = lens.reduce((a,b)=>a+b,0)/lens.length;
  const variance = lens.reduce((a,b)=>a + Math.pow(b-mean,2),0)/lens.length;
  const stdev = Math.sqrt(variance);
  return { mean: Math.round(mean*10)/10, stdev: Math.round(stdev*10)/10 };
}
export function typeTokenRatio(text) {
  const ws = words(text).map(w => w.toLowerCase().replace(/[^a-z0-9']/g,''));
  const uniq = new Set(ws);
  return ws.length ? +(uniq.size/ws.length).toFixed(3) : 0;
}
export function topBigrams(text, k=10) {
  const ws = words(text).map(w => w.toLowerCase());
  const counts = new Map();
  for (let i=0;i<ws.length-1;i++) {
    const bg = ws[i] + ' ' + ws[i+1];
    counts.set(bg, (counts.get(bg)||0)+1);
  }
  return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,k);
}
export function passiveVoiceFlags(text) {
  // Very rough heuristic: forms of "to be" + past participle (words ending with -ed)
  const flags = [];
  const sentsArr = sentences(text);
  const be = /(\b(is|am|are|was|were|be|been|being|\'s)\b\s+\b\w+ed\b)/i;
  sentsArr.forEach((s,i)=>{ if (be.test(s)) flags.push({ index:i, sentence:s }); });
  return flags;
}
export function jaccardSimilarity(a, b, n=3) {
  // Character n-gram Jaccard to detect too-close paraphrase against a source
  const A = new Set(ngrams(a.toLowerCase(), n));
  const B = new Set(ngrams(b.toLowerCase(), n));
  const inter = new Set([...A].filter(x => B.has(x)));
  const union = new Set([...A, ...B]);
  return union.size ? inter.size / union.size : 0;
}
function ngrams(s, n) {
  const arr = [];
  const clean = s.replace(/\s+/g, ' ');
  for (let i=0;i<=clean.length-n;i++) arr.push(clean.slice(i,i+n));
  return arr;
}

// Advanced, dependency-free text metrics
// Adds: multiple readability indices, improved syllables, lexical density,
// entropy, burstiness, repetition, n-gram stats, TF‑IDF cosine similarity,
// token Jaccard, and a single summary aggregator.

// ----------------------------
// Tokenization helpers
// ----------------------------
export function sentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}
export function words(text) {
  // keep apostrophes in contractions; keep numbers
  return String(text)
    .trim()
    .toLowerCase()
    .match(/[a-zA-Z0-9']+/g) || [];
}
export const sentenceCount = (t) => sentences(t).length;
export const wordCount = (t) => words(t).length;
export const charCount = (t) => String(t).replace(/\s/g, '').length;

// ----------------------------
// Syllable counting (English heuristic)
// ----------------------------
export function countSyllables(word) {
  if (!word) return 0;
  const w = String(word).toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  // common exceptions
  const exceptions = {
    queue: 1, people: 2, one: 1, once: 1, ones: 1, recipe: 3,
    business: 3, choir: 1, hour: 1, our: 1, europe: 3, fire: 1,
  };
  if (w in exceptions) return exceptions[w];

  // base count: groups of vowels
  const vowels = /[aeiouy]+/g;
  const groups = w.match(vowels);
  let count = groups ? groups.length : 0;

  // silent e at end
  if (w.endsWith('e')) count--;
  // add syllable for -le ending like table, maple
  if (/[^aeiou]le$/.test(w)) count++;
  // diphthong merges implicitly handled by groups

  count = Math.max(1, count);
  return count;
}

// ----------------------------
// Readability metrics
// ----------------------------
function avgSentenceLength(text) {
  const s = sentences(text); const w = words(text);
  return s.length ? w.length / s.length : 0;
}
function avgSyllablesPerWord(text) {
  const w = words(text); if (!w.length) return 0;
  const syll = w.reduce((a, wd) => a + countSyllables(wd), 0);
  return syll / w.length;
}
export function fleschReadingEase(text) {
  const ASL = avgSentenceLength(text);
  const ASW = avgSyllablesPerWord(text);
  if (!ASL || !ASW) return 0;
  return Math.round(206.835 - 1.015 * ASL - 84.6 * ASW);
}
export function fleschKincaidGrade(text) {
  const ASL = avgSentenceLength(text);
  const ASW = avgSyllablesPerWord(text);
  if (!ASL || !ASW) return 0;
  return +(0.39 * ASL + 11.8 * ASW - 15.59).toFixed(2);
}
export function gunningFogIndex(text) {
  const s = sentences(text).length; const w = words(text);
  if (!s || !w.length) return 0;
  const complex = w.filter(x => countSyllables(x) >= 3).length;
  const ASL = w.length / s;
  const PCW = (complex / w.length) * 100;
  return +((0.4 * (ASL + PCW))).toFixed(2);
}
export function smogIndex(text) {
  const s = sentences(text).length; const w = words(text);
  if (!s || !w.length) return 0;
  const polysyllables = w.filter(x => countSyllables(x) >= 3).length;
  return +(1.0430 * Math.sqrt(polysyllables * (30 / s)) + 3.1291).toFixed(2);
}
export function colemanLiauIndex(text) {
  const w = words(text); const s = sentences(text);
  if (!w.length || !s.length) return 0;
  const letters = w.join('').replace(/[^a-zA-Z]/g, '').length;
  const L = (letters / w.length) * 100; // letters per 100 words
  const S = (s.length / w.length) * 100; // sentences per 100 words
  return +(0.0588 * L - 0.296 * S - 15.8).toFixed(2);
}
export function automatedReadabilityIndex(text) {
  const w = words(text); const s = sentences(text);
  if (!w.length || !s.length) return 0;
  const chars = charCount(text);
  return +((4.71 * (chars / w.length)) + (0.5 * (w.length / s.length)) - 21.43).toFixed(2);
}

// ----------------------------
// Distribution + repetition
// ----------------------------
export function sentenceLengthStats(text) {
  const s = sentences(text);
  const lens = s.map(x => words(x).length);
  if (lens.length === 0) return { mean:0, stdev:0, cv:0 };
  const mean = lens.reduce((a,b)=>a+b,0)/lens.length;
  const variance = lens.reduce((a,b)=>a + Math.pow(b-mean,2),0)/lens.length;
  const stdev = Math.sqrt(variance);
  const cv = mean ? stdev/mean : 0; // coefficient of variation = burstiness proxy
  return { mean: +mean.toFixed(2), stdev: +stdev.toFixed(2), cv: +cv.toFixed(3) };
}
export function typeTokenRatio(text) {
  const ws = words(text).map(w => w.toLowerCase());
  const uniq = new Set(ws);
  return ws.length ? +(uniq.size/ws.length).toFixed(3) : 0;
}
export function topBigrams(text, k=10) {
  const ws = words(text).map(w => w.toLowerCase());
  const counts = new Map();
  for (let i=0;i<ws.length-1;i++) {
    const bg = ws[i] + ' ' + ws[i+1];
    counts.set(bg, (counts.get(bg)||0)+1);
  }
  return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,k);
}
export function topTrigrams(text, k=10) {
  const ws = words(text).map(w => w.toLowerCase());
  const counts = new Map();
  for (let i=0;i<ws.length-2;i++) {
    const tg = ws[i] + ' ' + ws[i+1] + ' ' + ws[i+2];
    counts.set(tg, (counts.get(tg)||0)+1);
  }
  return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,k);
}
export function repetitionScore(text) {
  // 0..1, higher = more repetition based on top n-grams share
  const ws = words(text);
  const total = ws.length;
  if (total < 10) return 0;
  const bigs = topBigrams(text, 5).reduce((a, [,c]) => a+c, 0);
  const trigs = topTrigrams(text, 5).reduce((a, [,c]) => a+c, 0);
  const score = Math.min(1, (bigs + trigs) / Math.max(1,total));
  return +score.toFixed(3);
}

// ----------------------------
// Passive voice flag (simple)
// ----------------------------
export function passiveVoiceFlags(text) {
  const flags = [];
  const sentsArr = sentences(text);
  const be = /(\b(is|am|are|was|were|be|been|being|\'s)\b\s+\b\w+ed\b)/i;
  sentsArr.forEach((s,i)=>{ if (be.test(s)) flags.push({ index:i, sentence:s }); });
  return flags;
}

// ----------------------------
// Lexical density (approximate; English stopwords)
// ----------------------------
const STOPWORDS = new Set(`a an and are as at be but by for if in into is it its of on or such that the their then there these they this to was were will with you your from have has had not can would should could`.split(/\s+/));
export function lexicalDensity(text) {
  const ws = words(text);
  if (!ws.length) return 0;
  const content = ws.filter(w => !STOPWORDS.has(w));
  return +((content.length / ws.length)).toFixed(3);
}

// ----------------------------
// Entropy (Shannon)
// ----------------------------
export function shannonEntropyChars(text) {
  const s = String(text);
  if (!s.length) return 0;
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch)||0)+1);
  const n = s.length;
  let H = 0;
  counts.forEach(c => { const p = c/n; H += -p * Math.log2(p); });
  return +H.toFixed(3);
}
export function shannonEntropyWords(text) {
  const ws = words(text);
  if (!ws.length) return 0;
  const counts = new Map();
  for (const w of ws) counts.set(w, (counts.get(w)||0)+1);
  const n = ws.length;
  let H = 0;
  counts.forEach(c => { const p = c/n; H += -p * Math.log2(p); });
  return +H.toFixed(3);
}

// ----------------------------
// Similarity measures
// ----------------------------
export function jaccardSimilarity(a, b, n=3) {
  // Character n-gram Jaccard to detect too-close paraphrase against a source
  const A = new Set(ngrams(a.toLowerCase(), n));
  const B = new Set(ngrams(b.toLowerCase(), n));
  const inter = new Set([...A].filter(x => B.has(x)));
  const union = new Set([...A, ...B]);
  return union.size ? inter.size / union.size : 0;
}
export function tokenJaccard(a, b) {
  const A = new Set(words(a));
  const B = new Set(words(b));
  const inter = new Set([...A].filter(x => B.has(x)));
  const union = new Set([...A, ...B]);
  return union.size ? inter.size / union.size : 0;
}
function ngrams(s, n) {
  const arr = [];
  const clean = s.replace(/\s+/g, ' ');
  for (let i=0;i<=clean.length-n;i++) arr.push(clean.slice(i,i+n));
  return arr;
}

export function cosineSimilarityTFIDF(a, b) {
  // simple TF‑IDF on union vocab of both docs
  const ta = words(a); const tb = words(b);
  const vocab = Array.from(new Set([...ta, ...tb]));
  const df = new Map();
  for (const token of new Set(ta)) df.set(token, (df.get(token)||0)+1);
  for (const token of new Set(tb)) df.set(token, (df.get(token)||0)+1);
  const N = 2;
  function vec(tokens) {
    const tf = new Map();
    tokens.forEach(t => tf.set(t, (tf.get(t)||0)+1));
    return vocab.map(t => {
      const tfv = (tf.get(t)||0);
      const idf = Math.log((N + 1) / ((df.get(t)||0) + 1)) + 1; // smoothed
      return tfv * idf;
    });
  }
  const va = vec(ta), vb = vec(tb);
  const dot = va.reduce((acc, v, i) => acc + v*vb[i], 0);
  const na = Math.sqrt(va.reduce((a,x) => a + x*x, 0));
  const nb = Math.sqrt(vb.reduce((a,x) => a + x*x, 0));
  return na && nb ? +(dot / (na*nb)).toFixed(4) : 0;
}

// ----------------------------
// Aggregator
// ----------------------------
export function summarize(text) {
  const fre = fleschReadingEase(text);
  const fk = fleschKincaidGrade(text);
  const fog = gunningFogIndex(text);
  const smog = smogIndex(text);
  const cli = colemanLiauIndex(text);
  const ari = automatedReadabilityIndex(text);
  const dens = lexicalDensity(text);
  const ttr = typeTokenRatio(text);
  const sl = sentenceLengthStats(text);
  const rep = repetitionScore(text);
  const Hc = shannonEntropyChars(text);
  const Hw = shannonEntropyWords(text);

  return {
    counts: { sentences: sentenceCount(text), words: wordCount(text), chars: charCount(text) },
    readability: { fre, fk, fog, smog, cli, ari },
    distribution: { ...sl, ttr, lexicalDensity: dens, entropyChars: Hc, entropyWords: Hw, repetition: rep },
    passiveFlags: passiveVoiceFlags(text)
  };
}