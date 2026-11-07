/**
 * npm run voices:generate -- --gender boy [--limit 20] [--voice Kore]
 *
 * يولّد المقاطع الناقصة مرة واحدة على جهازك (وليس أثناء اللعب)، ويحفظها ملفات
 * MP3 ثابتة في public/audio/voices. بعدها تعمل اللعبة بلا أي API وبلا اتصال.
 * السكربت يتخطى المقاطع الموجودة، فيمكن إيقافه واستئنافه (مفيد مع حدود الطبقة المجانية).
 *
 * المتطلبات (مرة واحدة):
 *   1) npm install --no-save @google/genai @breezystack/lamejs
 *   2) مفتاح مجاني من Google AI Studio:  GEMINI_API_KEY=...   (Windows: set GEMINI_API_KEY=...)
 *
 * متغيرات اختيارية:
 *   GEMINI_TTS_MODEL   افتراضياً gemini-2.5-flash-preview-tts (قد يتغير اسمه، راجع ai.google.dev)
 *   GEMINI_TTS_VOICE   اسم الصوت. جرّب أكثر من واحد (Kore, Leda, Aoede, Puck...) واختر الأقرب لصوت المقاطع الحالية
 *   TTS_STYLE          جملة توجيه تسبق النص
 *
 * بعد التوليد شغّل:  npm run voices:sync   ليُحدَّث manifest.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VOICES_DIR = path.join(ROOT, 'public/audio/voices');
const MISSING = path.join(ROOT, 'scripts/voices/missing.json');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const gender = opt('gender', 'both'); // boy | girl | both
const limit = Number(opt('limit', '0')) || Infinity;
const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
const voiceName = opt('voice', process.env.GEMINI_TTS_VOICE || 'Kore');
const style =
  process.env.TTS_STYLE ||
  'اقرأ بدفء وهدوء وبطء مناسب لطفل في الرابعة، بنبرة صديق لطيف وحنون، دون مبالغة:';

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

function pcmToMp3(Mp3Encoder, pcmBuffer, sampleRate = 24000, kbps = 48) {
  const samples = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, Math.floor(pcmBuffer.length / 2));
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
  console.log(`سيُولَّد ${todo.length} مقطعاً بالصوت ${voiceName} (${model})`);

  let done = 0;
  for (const item of todo) {
    let attempt = 0;
    for (;;) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: `${style} ${item.text}` }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        });
        const b64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!b64) throw new Error('الرد بلا صوت');
        const mp3 = pcmToMp3(Mp3Encoder, Buffer.from(b64, 'base64'));
        fs.writeFileSync(path.join(VOICES_DIR, `${item.key}.mp3`), mp3);
        done++;
        console.log(`[${done}/${todo.length}] ${item.key}  ${item.text}`);
        break;
      } catch (e) {
        attempt++;
        const msg = String(e?.message || e);
        const rateLimited = /429|quota|rate|RESOURCE_EXHAUSTED/i.test(msg);
        if (attempt >= 3 || (rateLimited && /per day|daily/i.test(msg))) {
          console.error(`توقف عند ${item.key}: ${msg.slice(0, 200)}`);
          console.error('شغّل الأمر نفسه لاحقاً، فهو يكمل من حيث توقف.');
          process.exit(done > 0 ? 0 : 1);
        }
        await sleep(rateLimited ? 30000 : 3000);
      }
    }
    await sleep(1500);
  }

  console.log('انتهى. شغّل الآن: npm run voices:sync');
}

main();
