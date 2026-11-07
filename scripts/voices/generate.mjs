/**
 * npm run voices:generate -- --gender boy [--limit 60] [--batch 6] [--voice Kore]
 *
 * يولّد المقاطع الناقصة مرة واحدة على جهازك (وليس أثناء اللعب)، ويحفظها ملفات
 * MP3 ثابتة في public/audio/voices. بعدها تعمل اللعبة بلا أي API وبلا اتصال.
 *
 * الطبقة المجانية تحدّد عدد الطلبات (نحو 10 يومياً و3 في الدقيقة)، وليس طول النص.
 * لذلك نرسل عدة جمل في طلب واحد (--batch)، ثم نقصّ الصوت الناتج عند فترات الصمت
 * إلى مقطع لكل جملة (scripts/voices/split.mjs). وإن لم نطمئن للقصّ نعيد المحاولة
 * بدفعة أصغر، فلا يُحفظ مقطع مقصوص خطأً.
 *
 * السكربت يتخطى المقاطع الموجودة، فيمكن إيقافه واستئنافه في أي وقت.
 *
 * المتطلبات (مرة واحدة):
 *   npm install --no-save @google/genai @breezystack/lamejs
 *   مفتاح مجاني من Google AI Studio:  GEMINI_API_KEY=...
 *
 * خيارات:
 *   --gender boy|girl|both   صيغة اللعبة المطلوبة (الافتراضي both)
 *   --limit N                أقصى عدد جمل يُولَّد في هذا التشغيل
 *   --batch N                عدد الجمل في الطلب الواحد (الافتراضي 6، و1 = جملة لكل طلب)
 *   --voice NAME             اسم الصوت (الافتراضي Kore)
 *   --max-requests N         أقصى عدد طلبات في هذا التشغيل (مفيد للحصة اليومية)
 *   --delay S                ثوانٍ بين الطلبات (الافتراضي 21 لأن الحد 3 في الدقيقة)
 *
 * متغيرات اختيارية: GEMINI_TTS_MODEL, GEMINI_TTS_VOICE, TTS_STYLE
 * بعد التوليد شغّل:  npm run voices:sync
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitBatch } from './split.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VOICES_DIR = path.join(ROOT, 'public/audio/voices');
const RAW_DIR = path.join(ROOT, 'scripts/voices/raw-batches');
const MISSING = path.join(ROOT, 'scripts/voices/missing.json');
const SAMPLE_RATE = 24000;

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const gender = opt('gender', 'both');
const limit = Number(opt('limit', '0')) || Infinity;
const batchSize = Math.max(1, Number(opt('batch', '6')) || 6);
const maxRequests = Number(opt('max-requests', '0')) || Infinity;
const delaySec = Number(opt('delay', '21'));
const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
const voiceName = opt('voice', process.env.GEMINI_TTS_VOICE || 'Kore');
const style = (
  process.env.TTS_STYLE ||
  'اقرأ بدفء وهدوء وبطء مناسب لطفل في الرابعة، بنبرة صديق لطيف وحنون، دون مبالغة'
).replace(/[:：]\s*$/, '');

let requests = 0;

class QuotaError extends Error {}

async function loadDeps() {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const lame = await import('@breezystack/lamejs');
    return { GoogleGenAI, Mp3Encoder: lame.Mp3Encoder ?? lame.default?.Mp3Encoder };
  } catch (e) {
    console.error('ثبّت الحزم أولاً:  npm install --no-save @google/genai @breezystack/lamejs');
    console.error(String(e?.message || e));
    process.exit(1);
  }
}

function pcmToMp3(Mp3Encoder, samples, sampleRate = SAMPLE_RATE, kbps = 48) {
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const chunks = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const out = encoder.encodeBuffer(samples.subarray(i, i + 1152));
    if (out.length) chunks.push(Buffer.from(out));
  }
  const end = encoder.flush();
  if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** النقاط المتتالية تجعل الصوت يتوقف طويلاً فيلتبس بالفجوة بين الجمل، فنستبدلها بفاصلة */
function forSpeech(text) {
  return text.replace(/\.{2,}|…/g, '،').replace(/\s+/g, ' ').trim();
}

function buildPrompt(items) {
  if (items.length === 1) return `${style}: ${forSpeech(items[0].text)}`;
  const lines = items.map(i => forSpeech(i.text)).join('\n');
  return `${style}، وبين كل جملة والتي تليها توقف ثانية كاملة من الصمت:\n${lines}`;
}

/** طلب واحد إلى الخدمة، ويعيد عيّنات PCM. يرمي QuotaError عند نفاد الحصة. */
async function requestAudio(ai, items) {
  if (requests >= maxRequests) throw new QuotaError('بلغنا الحد الأقصى للطلبات المحدد بـ --max-requests');
  let quotaRetried = false;
  for (let attempt = 0; ; attempt++) {
    try {
      requests++;
      const res = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: buildPrompt(items) }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });
      const b64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) throw new Error('الرد بلا صوت');
      const pcm = Buffer.from(b64, 'base64');
      return new Int16Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.length - (pcm.length % 2)));
    } catch (e) {
      const msg = String(e?.message || e);
      if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
        // مرة واحدة ننتظر دقيقة (قد يكون حد الدقيقة)، ثم نعدّه نفاداً للحصة
        if (!quotaRetried) {
          quotaRetried = true;
          console.log('  حد الطلبات: أنتظر 65 ثانية وأعيد مرة واحدة...');
          await sleep(65000);
          continue;
        }
        throw new QuotaError(msg);
      }
      if (attempt >= 2) throw e;
      await sleep(4000);
    }
  }
}

function saveRaw(samples, items) {
  try {
    fs.mkdirSync(RAW_DIR, { recursive: true });
    const base = path.join(RAW_DIR, `${Date.now()}-${items[0].key}`);
    fs.writeFileSync(`${base}.pcm`, Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
    fs.writeFileSync(`${base}.json`, JSON.stringify({ sampleRate: SAMPLE_RATE, items }, null, 2));
  } catch {
    // الحفظ للتشخيص فقط
  }
}

function trySplit(samples, items) {
  let lastError;
  for (const minGapMs of [220, 350, 160]) {
    try {
      return splitBatch(samples, items.map(i => i.text), SAMPLE_RATE, { minGapMs });
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('ضع المفتاح المجاني في GEMINI_API_KEY');
    process.exit(1);
  }
  if (!fs.existsSync(MISSING)) {
    console.error('شغّل أولاً: npm run voices:sync');
    process.exit(1);
  }

  const { GoogleGenAI, Mp3Encoder } = await loadDeps();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const todo = JSON.parse(fs.readFileSync(MISSING, 'utf8'))
    .filter(m => gender === 'both' || m.genders.includes(gender))
    .filter(m => !fs.existsSync(path.join(VOICES_DIR, `${m.key}.mp3`)))
    .slice(0, limit);

  fs.mkdirSync(VOICES_DIR, { recursive: true });
  console.log(`المطلوب: ${todo.length} جملة، بدفعات من ${batchSize}، بالصوت ${voiceName} (${model})`);
  console.log(`الطلبات المتوقعة: نحو ${Math.ceil(todo.length / batchSize)} (الحد المجاني نحو 10 يومياً)`);

  let done = 0;

  const save = (item, samples) => {
    fs.writeFileSync(path.join(VOICES_DIR, `${item.key}.mp3`), pcmToMp3(Mp3Encoder, samples));
    done++;
    console.log(`  [${done}/${todo.length}] ${item.key}  ${item.text}`);
  };

  // يعالج مجموعة جمل: طلب واحد، فإن لم ينجح القصّ تُقسم المجموعة وتُعاد
  const processGroup = async items => {
    if (requests > 0) await sleep(delaySec * 1000);
    console.log(`طلب ${requests + 1}: ${items.length} جملة`);
    const samples = await requestAudio(ai, items);
    saveRaw(samples, items);

    let parts;
    try {
      parts = trySplit(samples, items);
    } catch (e) {
      if (items.length === 1) throw e;
      console.log(`  لم أطمئن للقصّ (${e.message}). سأقسم الدفعة وأعيد.`);
      const mid = Math.ceil(items.length / 2);
      await processGroup(items.slice(0, mid));
      await processGroup(items.slice(mid));
      return;
    }
    items.forEach((item, i) => save(item, parts[i]));
  };

  try {
    for (let i = 0; i < todo.length; i += batchSize) {
      await processGroup(todo.slice(i, i + batchSize));
    }
  } catch (e) {
    if (e instanceof QuotaError) {
      console.error('\nتوقفت لأن حصة الطلبات انتهت. ما وُلّد محفوظ.');
      console.error('الطبقة المجانية تتجدد يومياً (غالباً نحو 11 صباحاً بتوقيت دمشق).');
      console.error(`ما رُفض: ${String(e.message).slice(0, 160)}`);
    } else {
      console.error('\nخطأ غير متوقع:', String(e?.message || e).slice(0, 300));
    }
    console.error(`المحفوظ في هذا التشغيل: ${done} مقطعاً. أعد نفس الأمر لاحقاً وسيكمل.`);
    process.exit(done > 0 ? 0 : 1);
  }

  console.log(`\nانتهى: ${done} مقطعاً في ${requests} طلباً. شغّل الآن: npm run voices:sync`);
}

main();
