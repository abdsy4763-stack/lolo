/**
 * node scripts/voices/test-split.mjs
 * يختبر القصّ على المقاطع القديمة: يلصقها بفجوات صمت مختلفة ثم يتحقق أن القصّ
 * يعيد مقاطع بنفس أطوالها الأصلية تقريباً وبعددها.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitBatch, readWavPcm } from './split.mjs';
import { LEGACY_CLIPS } from './legacy-clips.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'legacy-wav');

// breathing.wav فيه وقفات تنفّس متعمدة طويلة، فلا يمثّل كلاماً عادياً، ونستثنيه من الاختبار
const clips = LEGACY_CLIPS.filter(c => c.file !== 'breathing.wav').map(c => {
  const { samples, rate } = readWavPcm(fs.readFileSync(path.join(dir, c.file)));
  return { ...c, samples, rate };
});

function build(group, gapMs, rate) {
  const gap = new Int16Array(Math.round((rate * gapMs) / 1000));
  const parts = [];
  group.forEach((c, i) => {
    if (i) parts.push(gap);
    parts.push(c.samples);
  });
  const out = new Int16Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

let pass = 0;
let fail = 0; // رفض آمن (الدفعة ترفض ولا يُحفظ شيء خاطئ)
let wrong = 0; // قصّ خاطئ مرّ بصمت: يجب أن يبقى صفراً
const failures = [];

for (const gapMs of [1000, 600, 400]) {
  for (const size of [1, 2, 4, 5, 6, 8]) {
    for (let start = 0; start + size <= clips.length; start += size) {
      const group = clips.slice(start, start + size);
      const rate = group[0].rate;
      const merged = build(group, gapMs, rate);
      try {
        const parts = splitBatch(merged, group.map(c => c.text), rate);
        const ok = parts.length === group.length && parts.every((p, i) => {
          const want = group[i].samples.length;
          return Math.abs(p.length - want) / want < 0.2;
        });
        if (ok) pass++;
        else {
          wrong++;
          failures.push(`قصّ خاطئ gap=${gapMs} size=${size} start=${start}`);
        }
      } catch (e) {
        fail++;
        failures.push(`gap=${gapMs} size=${size} start=${start}: ${e.message}`);
      }
    }
  }
}

console.log(`نجح ${pass}، رُفض بأمان ${fail}، قصّ خاطئ صامت ${wrong}`);
failures.slice(0, 12).forEach(f => console.log('  -', f));
process.exit(wrong ? 1 : 0);
