// Advanced AI-to-Human text converter core (v2.2)
// Goals: human-like rhythm and tone without altering facts. Deterministic via seed.
// Adds: style profiles, audience targeting, domain-aware vocab, protected spans,
// clause re-ordering, rhetorical questions, selective contractions, logging/trace,
// integrity check, and a single high-level API.
// New in v2.2:
// - Markdown-aware protection (headings, links, images, tables, blockquotes)
// - Dates/currencies/units protection
// - Length control: keep | shorten | expand with change budget
// - Tone-by-example via `referenceStyle` analysis
// - Per-sentence seeded variation for stable yet diverse outputs
// - Structure safety for lists and headings; bullet normalization
// - Optional question forbidding; paragraph reflow with max line length
// - Hooks: before/after for custom transforms

// ----------------------------
// Seeded RNG + hashing
// ----------------------------
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function strHash(s = "") {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)] }

// ----------------------------
// Lexicons
// ----------------------------
const REGION_SLANG = {
  US: ["pretty much","kinda","sort of","I mean","honestly","you know","for what it’s worth","to be fair","heads up"],
  UK: ["sort of","a bit","cheers","to be fair","fair enough","right then","mind you","reckon","proper"],
  AU: ["a bit","reckon","no worries","to be honest","fair go","heaps","righto","cheers"],
  IN: ["actually","to be honest","as such","kind of","basically","by the way","anyways"],
};

const CONTRACTIONS = [
  [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"], [/\bis not\b/gi, "isn't"],
  [/\bare not\b/gi, "aren't"], [/\bcannot\b/gi, "can't"], [/\bcould not\b/gi, "couldn't"],
  [/\bwould not\b/gi, "wouldn't"], [/\bshould not\b/gi, "shouldn't"], [/\bI am\b/g, "I'm"],
  [/\bwe are\b/gi, "we're"], [/\byou are\b/gi, "you're"], [/\bthey are\b/gi, "they're"], [/\bit is\b/gi, "it's"],
];

const SOFT_SYNONYMS = [
  [/\btherefore\b/gi, "so"], [/\bhowever\b/gi, "but"], [/\butilize\b/gi, "use"],
  [/\bapproximately\b/gi, "about"], [/\bdemonstrate\b/gi, "show"],
];

// Domain dictionaries (extendable)
const DOMAIN_MAP = {
  technical: [
    [/\buse\b/gi, "apply"], [/\bthings\b/gi, "artifacts"], [/\bfix\b/gi, "patch"],
    [/\bshow\b/gi, "indicate"], [/\bcheck\b/gi, "verify"],
  ],
  marketing: [
    [/\buse\b/gi, "leverage"], [/\bproblem\b/gi, "pain point"], [/\bfixed\b/gi, "resolved"],
    [/\bfast\b/gi, "rapid"], [/\bstart\b/gi, "get started"],
  ],
  academic: [
    [/\bshows\b/gi, "demonstrates"], [/\btry\b/gi, "attempt"], [/\bcheck\b/gi, "evaluate"],
    [/\bbecause\b/gi, "because"],
  ],
};

// ----------------------------
// Protection of non-linguistic and Markdown spans
// ----------------------------
const PROTECT_PATTERNS = [
  /```[\s\S]*?```/g,           // fenced code
  /`[^`\n]+`/g,                 // inline code
  /\[(?:[^\]]+)\]\((?:[^)]+)\)/g, // Markdown links [text](url)
  /!\[(?:[^\]]*)\]\((?:[^)]+)\)/g, // Markdown images
  /^(?:\s{0,3}#{1,6} .*?$)/gm,  // Markdown headings
  /^\s{0,3}> .*$/gm,            // blockquotes
  /\|.*\|/gm,                   // tables (rough)
  /https?:\/\/\S+/g,           // URLs
  /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, // emails
  /#[0-9A-Fa-f]{3,8}\b/g,       // hex colors
  /\b\d[\d.,:%]*\b/g,        // numbers
  /\b(?:USD|EUR|GBP|INR|JPY|CNY|AUD|CAD)\s?\d[\d.,]*\b/gi, // currencies
  /\b\d{1,2}\s?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s?\d{2,4}\b/gi, // dates like 20 Sep 2025
  /\b\d+\s?(?:ms|s|sec|seconds|minutes|min|hours|hrs|hr|kg|g|lb|cm|mm|m|km|mi|%|ppm)\b/gi, // units
];

function protectSegments(text) {
  const placeholders = [];
  let t = text;
  PROTECT_PATTERNS.forEach((re, idx) => {
    t = t.replace(re, (m) => {
      const key = `[[HX_${idx}_${placeholders.length}]]`;
      placeholders.push(m);
      return key;
    });
  });
  return { t, placeholders };
}

function restoreSegments(text, placeholders) {
  let t = text;
  for (let i = 0; i < placeholders.length; i++) {
    for (let k = 0; k < PROTECT_PATTERNS.length; k++) {
      t = t.replace(`[[HX_${k}_${i}]]`, placeholders[i]);
    }
  }
  return t;
}

// ----------------------------
// Core transforms
// ----------------------------
function smartContractions(text, enable) {
  if (!enable) return text;
  let s = text;
  for (const [re, sub] of CONTRACTIONS) s = s.replace(re, sub);
  return s;
}

function insertDiscourseMarkers(text, { region, density, rand }) {
  const markers = REGION_SLANG[region] || REGION_SLANG.US;
  const parts = text.split(/(?<=[.!?])\s+/);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length < 30) continue;
    if (rand() < density) {
      const mk = pick(rand, markers);
      const rx = new RegExp(`^(${markers.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")})[, ]`, 'i');
      if (!rx.test(parts[i])) parts[i] = `${mk[0].toUpperCase()+mk.slice(1)}, ${parts[i][0].toLowerCase()}${parts[i].slice(1)}`;
    }
  }
  return parts.join(" ");
}

function varyRhythm(text, fragmentRate, rand) {
  return text.replace(/,([^,]{8,50})\./g, (m, grp) => (rand() < fragmentRate ? `. ${grp.trim()}.` : m));
}

function reorderClauses(text, rate, rand) {
  // Swap first two comma-separated clauses occasionally
  return text.replace(/(^|[.!?]\s+)([^.!?]{40,200})/g, (m, lead, sent) => {
    if (rand() >= rate) return m;
    const parts = sent.split(/,\s+/);
    if (parts.length < 2) return m;
    const a = parts[0], b = parts[1];
    if (a.split(' ').length < 4 || b.split(' ').length < 4) return m;
    parts[0] = b; parts[1] = a;
    return lead + parts.join(', ');
  });
}

function rhetoricalQuestion(text, rate, rand) {
  return text.replace(/([^.?!]{40,120})(\.)/g, (m, grp) => (rand() < rate ? `${grp}?` : m));
}

function mildImperfections(text, level, rand) {
  if (level <= 0) return text;
  let t = text;
  if (level >= 1) t = t.replace(/\b(however|therefore|moreover)\b/gi, (m) => (rand() < 0.2 ? `${m}…` : m));
  if (level >= 2) t = t.replace(/\. (\p{L})/gu, (m, c) => (rand() < 0.12 ? `.  ${c}` : `. ${c}`));
  if (level >= 3) t = t.replace(/\breally\b/gi, (m) => (rand() < 0.15 ? "really, truly" : m));
  return t;
}

function gentleSynonyms(text, rate, rand) {
  if (rate <= 0) return text;
  let out = text;
  for (const [re, sub] of SOFT_SYNONYMS) out = out.replace(re, (m) => (rand() < rate ? sub : m));
  return out;
}

function eslLightDrops(text, rate, rand) {
  return text.replace(/\b(the|a|an) (\b\w{4,}\b)/gi, (m) => (rand() < rate ? m.replace(/^(the|a|an)\s/i, "") : m));
}

function domainShade(text, domain, rate, rand) {
  const rules = DOMAIN_MAP[domain];
  if (!rules || rate <= 0) return text;
  let out = text;
  for (const [re, sub] of rules) out = out.replace(re, (m) => (rand() < rate ? sub : m));
  return out;
}

function applyStyleSheet(text, styleProfile = {}, rand) {
  const { preferredTerms = {}, forbiddenPhrases = [] } = styleProfile;
  let out = text;
  // enforce preferred terms
  for (const k of Object.keys(preferredTerms)) {
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    out = out.replace(re, preferredTerms[k]);
  }
  // soften forbidden phrases by removing or adjusting
  for (const phrase of forbiddenPhrases) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    out = out.replace(re, '');
  }
  return out;
}

// ----------------------------
// Presets
// ----------------------------
const PRESETS = {
  formal:   { density: 0.04, fragmentRate: 0.02, synonymRate: 0.02, contractions: false, eslDrop: 0, reorder: 0.00, rhet: 0.00, domain: 'academic' },
  neutral:  { density: 0.08, fragmentRate: 0.05, synonymRate: 0.04, contractions: true,  eslDrop: 0, reorder: 0.03, rhet: 0.02, domain: null },
  casual:   { density: 0.12, fragmentRate: 0.08, synonymRate: 0.06, contractions: true,  eslDrop: 0, reorder: 0.06, rhet: 0.04, domain: null },
  technical:{ density: 0.06, fragmentRate: 0.03, synonymRate: 0.03, contractions: true,  eslDrop: 0, reorder: 0.02, rhet: 0.00, domain: 'technical' },
  marketing:{ density: 0.10, fragmentRate: 0.06, synonymRate: 0.06, contractions: true,  eslDrop: 0, reorder: 0.05, rhet: 0.03, domain: 'marketing' },
  academic: { density: 0.04, fragmentRate: 0.02, synonymRate: 0.02, contractions: false, eslDrop: 0, reorder: 0.01, rhet: 0.00, domain: 'academic' },
};

// ----------------------------
// Integrity & logging
// ----------------------------
function tokenizeWords(s) {
  return (s.toLowerCase().match(/[a-zA-Z][a-zA-Z'-]+/g) || []).filter(w => w.length > 2);
}

function jaccardSimilarity(aText, bText) {
  const A = new Set(tokenizeWords(aText));
  const B = new Set(tokenizeWords(bText));
  const inter = new Set([...A].filter(x => B.has(x)));
  const union = new Set([...A, ...B]);
  return union.size ? inter.size / union.size : 1;
}

// ----------------------------
// Style-by-example analysis
// ----------------------------
function analyzeStyle(sample) {
  if (!sample) return null;
  const sents = String(sample).split(/(?<=[.!?])\s+/).filter(Boolean);
  const words = String(sample).toLowerCase().match(/[a-zA-Z']+/g) || [];
  const contractionsRate = /\b(I'm|you're|we're|they're|it's|don't|can't|wouldn't|shouldn't|isn't|aren't)\b/i.test(sample) ? 1 : 0;
  const avgLen = sents.length ? words.length / sents.length : 0;
  const longSentShare = sents.length ? sents.filter(x => x.split(/\s+/).length >= 22).length / sents.length : 0;
  return { contractionsRate, avgLen, longSentShare };
}

// ----------------------------
// Structure helpers
// ----------------------------
function normalizeBullets(text) {
  // Ensure list markers use '-' and preserve indentation
  return text.replace(/^\s*(?:\*|\+|•)\s+/gm, "- ");
}

function forbidQuestionsIfNeeded(text, forbid) {
  return forbid ? text.replace(/\?+/g, '.') : text;
}

function reflowParagraphs(text, maxLine = 0) {
  if (!maxLine) return text;
  return text.split(/\n\n+/).map(p => {
    const words = p.split(/\s+/);
    let line = ""; const out = [];
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxLine) { out.push(line.trim()); line = w; }
      else { line = (line ? line + ' ' : '') + w; }
    }
    if (line) out.push(line.trim());
    return out.join("\n");
  }).join("\n\n");
}

// ----------------------------
// Length control with change budget
// ----------------------------
function lengthControl(original, current, mode, changeBudget = 0.25, rand) {
  // changeBudget: max fraction of sentences allowed to be edited for length operations
  if (mode === 'keep') return current;
  const sents = current.split(/(?<=[.!?])\s+/);
  const origSents = original.split(/(?<=[.!?])\s+/);
  const budget = Math.max(1, Math.floor(sents.length * changeBudget));

  const pickIdx = (n) => {
    const idx = new Set();
    while (idx.size < Math.min(n, sents.length)) {
      idx.add(Math.floor(rand() * sents.length));
    }
    return Array.from(idx);
  };

  const idxs = pickIdx(budget);
  const expanders = [
    ' For clarity,',
    ' In practice,',
    ' In other words,',
    ' More concretely,',
  ];
  const shorteners = [
    (t) => t.replace(/\s*\([^)]*\)/g, ''),                 // drop parentheticals
    (t) => t.replace(/,?\s*(which|that)\b[^,.!?]*?(?=[,.!?])/gi, ''), // trim clauses
    (t) => t.replace(/\s+,/g, ','),                          // tighten spacing
  ];

  const out = sents.slice();
  for (const i of idxs) {
    let s = out[i];
    if (!s) continue;
    if (mode === 'expand' && s.length < 240) {
      const ex = pick(rand, expanders);
      s = s.replace(/([.!?])$/, `${ex.toLowerCase()} $1`).replace(/\s+([.!?])/, '$1');
      out[i] = s;
    }
    if (mode === 'shorten' && s.length > 60) {
      const fn = pick(rand, shorteners);
      out[i] = fn(s);
    }
  }
  return out.join(' ');
}

// ----------------------------
// Public APIs
// ----------------------------
export function addHumanTexture(text, opts) {
  // Backward-compatible thin wrapper over advanced engine
  return humanizeAdvanced(text, opts).text;
}

export function humanizeAdvanced(text, opts) {
  const {
    region = 'US',
    fluency = 'native',            // 'native' | 'near-native' | 'esl-light'
    formality = 'neutral',         // extends to 'technical' | 'marketing' | 'academic'
    audience = 'general',          // 'engineers' | 'executives' | 'students' | etc.
    errors = 0,
    markers = true,
    contractions = true,
    synonymSoftening = true,
    styleProfile = {},             // { preferredTerms, forbiddenPhrases }
    domain = null,                 // overrides preset domain when set
    seed = 0,                      // number|string|undefined
    targetSimilarity = 0.70,       // integrity floor
    // new options
    preserveMarkdown = true,
    lengthMode = 'keep',           // 'keep' | 'shorten' | 'expand'
    changeBudget = 0.25,           // fraction of sentences editable by length control
    maxLine = 0,                   // reflow line length; 0 = no reflow
    referenceStyle = null,         // optional sample text to infer style
    perSentenceSeed = true,        // vary RNG per sentence deterministically
    forbidQuestions = false,       // convert '?' to '.' if true
    hooks = {},                    // { before(text,ctx), after(text,ctx) }
  } = opts || {};

  const base = PRESETS[formality] || PRESETS.neutral;
  const seedNum = typeof seed === 'number' ? seed : strHash(String(seed || text.slice(0, 64)) + '|' + formality + '|' + region);
  const rand = mulberry32(seedNum);

  // Style-by-example override
  const ref = analyzeStyle(referenceStyle);
  const refDensity = ref ? Math.min(0.16, Math.max(0.01, ref.longSentShare * 0.12 + (ref.contractionsRate ? 0.02 : 0))) : null;
  const density = markers ? (refDensity ?? base.density) : 0;
  const presetContractions = base.contractions && contractions && formality !== 'formal';

  const ops = [];

  // Protect spans
  const { t: protectedText, placeholders } = protectSegments(text);
  let working = protectedText;

  // User hook: before
  if (typeof hooks.before === 'function') {
    working = hooks.before(working, { seed: seedNum, opts });
  }

  // Structure safe changes per sentence
  const sentences = working.split(/(?<=[.!?])\s+/);
  for (let i = 0; i < sentences.length; i++) {
    let s = sentences[i];
    if (!s.trim()) continue;

    const localRand = perSentenceSeed ? mulberry32(seedNum ^ strHash(String(i))) : rand;

    if (presetContractions) { s = smartContractions(s, true); ops.push('contractions'); }
    if (density > 0) { s = insertDiscourseMarkers(s, { region, density, rand: localRand }); ops.push('markers'); }
    s = varyRhythm(s, base.fragmentRate, localRand); ops.push('rhythm');
    if (base.reorder > 0) { s = reorderClauses(s, base.reorder, localRand); ops.push('reorder'); }
    if (base.rhet > 0) { s = rhetoricalQuestion(s, base.rhet, localRand); ops.push('rhet'); }
    if (fluency === 'esl-light') { s = eslLightDrops(s, Math.max(0.01, base.density/1.5), localRand); ops.push('esl-drop'); }
    if (synonymSoftening) { s = gentleSynonyms(s, base.synonymRate, localRand); ops.push('soft-syn'); }

    sentences[i] = s;
  }
  working = sentences.join(' ');

  // Domain vocabulary and stylesheet at paragraph level
  const domainEff = domain || base.domain;
  if (domainEff) { working = domainShade(working, domainEff, 0.5, rand); ops.push(`domain:${domainEff}`); }
  working = applyStyleSheet(working, styleProfile, rand); ops.push('style-sheet');

  // Length control with budget
  working = lengthControl(text, working, lengthMode, changeBudget, rand);

  // Optional question removal
  working = forbidQuestionsIfNeeded(working, forbidQuestions);

  // Normalize list bullets
  if (preserveMarkdown) working = normalizeBullets(working);

  // Restore protected spans
  working = restoreSegments(working, placeholders);

  // Reflow paragraphs if requested
  working = reflowParagraphs(working, maxLine);

  // Integrity check
  const sim = jaccardSimilarity(text, working);
  const ok = sim >= targetSimilarity;

  const meta = {
    seed: seedNum,
    inputHash: strHash(text).toString(16),
    outputHash: strHash(working).toString(16),
    similarity: sim,
    audience,
    formality,
    region,
    operations: Array.from(new Set(ops)),
    ok,
  };

  // User hook: after
  if (typeof hooks.after === 'function') {
    working = hooks.after(working, { seed: seedNum, opts, meta }) || working;
  }

  return { text: working, meta };
}

// Convenience: fixed-seed wrapper
export function addHumanTextureWithFixedSeed(text, opts, fixedSeed) {
  return humanizeAdvanced(text, { ...(opts||{}), seed: fixedSeed });
}

// Minimal diff utility (token-level)
export function simpleDiff(a, b) {
  const A = a.split(/\s+/), B = b.split(/\s+/);
  const changes = [];
  let i=0,j=0;
  while (i<A.length || j<B.length) {
    if (A[i] === B[j]) { i++; j++; continue; }
    const from = A[i] || ''; const to = B[j] || '';
    changes.push({ from, to, i, j });
    i++; j++;
  }
  return changes;
}

// ----------------------------
// Example CLI-style runner (callable from your own bin script)
// ----------------------------
export function runCliLike(input, options) {
  const { text, meta } = humanizeAdvanced(input, options);
  return { text, meta };
}