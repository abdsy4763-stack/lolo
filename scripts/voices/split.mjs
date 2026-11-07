/**
 * قصّ مقطع صوتي طويل (عدة جمل متتالية) إلى مقاطع منفصلة، جملة لكل مقطع.
 *
 * المدخل: عيّنات PCM (Int16Array، أحادية) + نصوص الجمل بالترتيب.
 * الطريقة:
 *   1. نقسّم الصوت إلى نوافذ 20ms ونحسب طاقتها، ونعدّ النافذة صامتة إن كانت طاقتها
 *      أقل من نسبة صغيرة من الطاقة المعتادة للكلام.
 *   2. الصمت المتصل الذي لا يقل عن MIN_GAP_MS هو "فجوة" مرشحة.
 *   3. نتوقع موضع كل حدّ بين جملتين حسب عدد الأحرف، ونختار أطول فجوة قريبة من التوقع.
 *   4. نتحقق أن سرعة كل مقطع (أحرف/ثانية) قريبة من الوسيط. وإلا نرمي خطأ
 *      ليعيد المستدعي المحاولة بدفعة أصغر، ولا نحفظ مقطعاً مقصوصاً خطأً.
 */

const WINDOW_MS = 20;
const MIN_GAP_MS = 220;
const PAD_MS = 70;

function letterCount(text) {
  return Math.max(1, (text.match(/[ء-ي0-9]/g) || []).length);
}

function windowEnergies(samples, sampleRate) {
  const win = Math.round((sampleRate * WINDOW_MS) / 1000);
  const count = Math.floor(samples.length / win);
  const rms = new Float64Array(count);
  for (let w = 0; w < count; w++) {
    let sum = 0;
    const base = w * win;
    for (let i = 0; i < win; i++) {
      const v = samples[base + i];
      sum += v * v;
    }
    rms[w] = Math.sqrt(sum / win);
  }
  return { rms, win };
}

function silenceThreshold(rms) {
  const sorted = Array.from(rms).sort((a, b) => a - b);
  const p90 = sorted[Math.floor(sorted.length * 0.9)] || 1;
  return Math.max(30, p90 * 0.06);
}

/** يعيد مصفوفة من Int16Array بعدد النصوص، أو يرمي Error إن لم يطمئن للقصّ */
export function splitBatch(samples, texts, sampleRate = 24000, opts = {}) {
  const n = texts.length;
  const MIN_GAP = opts.minGapMs ?? MIN_GAP_MS;
  const { rms, win } = windowEnergies(samples, sampleRate);
  if (rms.length < 5) throw new Error('الصوت قصير جداً');

  const thr = silenceThreshold(rms);
  const silent = Array.from(rms, v => v < thr);

  // بداية الكلام ونهايته
  let first = silent.indexOf(false);
  let last = silent.lastIndexOf(false);
  if (first < 0) throw new Error('الصوت صامت');

  const trimTo = (a, b) => {
    // يقص الصمت من طرفي المقطع [a, b) بالنوافذ، ويترك حشوة صغيرة
    let s = a;
    let e = b - 1;
    while (s < e && silent[s]) s++;
    while (e > s && silent[e]) e--;
    const pad = Math.round(PAD_MS / WINDOW_MS);
    const from = Math.max(0, s - pad) * win;
    const to = Math.min(rms.length, e + 1 + pad) * win;
    return samples.slice(from, to);
  };

  if (n === 1) return [trimTo(first, last + 1)];

  // الفجوات المرشحة داخل نطاق الكلام
  const minRun = Math.ceil(MIN_GAP / WINDOW_MS);
  const gaps = [];
  let runStart = -1;
  for (let w = first; w <= last + 1; w++) {
    const isSil = w <= last && silent[w];
    if (isSil && runStart < 0) runStart = w;
    if (!isSil && runStart >= 0) {
      if (w - runStart >= minRun) gaps.push({ start: runStart, end: w, len: w - runStart });
      runStart = -1;
    }
  }
  if (gaps.length < n - 1) throw new Error(`وُجدت ${gaps.length} فجوات فقط والمطلوب ${n - 1}`);

  // موضع كل حدّ متوقع بالنسبة لعدد الأحرف
  const weights = texts.map(letterCount);
  const total = weights.reduce((a, b) => a + b, 0);
  const span = last - first + 1;
  const avgSeg = span / n;
  const tol = avgSeg * 0.42;

  const cuts = [];
  let cum = 0;
  let prevEnd = first;
  for (let i = 0; i < n - 1; i++) {
    cum += weights[i];
    const expected = first + (cum / total) * span;
    let best = null;
    for (const g of gaps) {
      const center = (g.start + g.end) / 2;
      if (g.start < prevEnd) continue;
      if (Math.abs(center - expected) > tol) continue;
      if (!best || g.len > best.len) best = g;
    }
    if (!best) throw new Error(`لم أجد فجوة مناسبة بعد الجملة ${i + 1}`);
    cuts.push(best);
    prevEnd = best.end;
  }

  // التباس: وقفة داخلية غير مختارة بطول الفجوات الفاصلة تقريباً يعني أننا قد نخطئ الحدّ.
  // نرفض الدفعة بدل أن نقصّ خطأً بصمت.
  const chosen = new Set(cuts);
  const minChosen = Math.min(...cuts.map(g => g.len));
  for (const g of gaps) {
    if (!chosen.has(g) && g.len >= minChosen * 0.85) {
      throw new Error('التباس بين وقفة داخل جملة وفجوة بين جملتين');
    }
  }

  // المقاطع بين الفجوات
  const bounds = [];
  let from = first;
  for (const g of cuts) {
    bounds.push([from, g.start]);
    from = g.end;
  }
  bounds.push([from, last + 1]);

  // تحقق من سرعة الكلام لكل مقطع
  const rates = bounds.map(([a, b], i) => ((b - a) * WINDOW_MS) / 1000 / weights[i]);
  const sortedRates = [...rates].sort((a, b) => a - b);
  const median = sortedRates[Math.floor(sortedRates.length / 2)];
  rates.forEach((r, i) => {
    const ratio = r / median;
    if (ratio < 0.5 || ratio > 2.0) {
      throw new Error(`مقطع ${i + 1} بسرعة غير معقولة (نسبة ${ratio.toFixed(2)})`);
    }
  });

  return bounds.map(([a, b]) => trimTo(a, b));
}

/** قراءة WAV أحادي 16-بت (للاختبار فقط) */
export function readWavPcm(buffer) {
  let pos = 12;
  let rate = 24000;
  while (pos + 8 <= buffer.length) {
    const id = buffer.toString('ascii', pos, pos + 4);
    const size = buffer.readUInt32LE(pos + 4);
    if (id === 'fmt ') rate = buffer.readUInt32LE(pos + 12);
    if (id === 'data') {
      const bytes = buffer.subarray(pos + 8, pos + 8 + size);
      const copy = Buffer.from(bytes);
      return { samples: new Int16Array(copy.buffer, copy.byteOffset, Math.floor(copy.length / 2)), rate };
    }
    pos += 8 + size + (size % 2);
  }
  throw new Error('لا يوجد chunk بيانات');
}
