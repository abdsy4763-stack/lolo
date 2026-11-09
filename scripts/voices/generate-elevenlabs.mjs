/**
 * node scripts/voices/generate-elevenlabs.mjs --gender boy [--limit 5] [--voice ID]
 *
 * يولّد المقاطع الناقصة بصوت ElevenLabs ويحفظها MP3 في public/audio/voices.
 * يتخطى الموجود، ويتوقف بهدوء عند نفاد الرصيد، ويمكن استئنافه.
 * الصوت الافتراضي: Laloosh (ZNWTizjpq2mvJDByKqIR) الذي أعجبك في التجربة.
 *
 * المتطلبات: مفتاح API من حسابك في ElevenLabs (الصلاحية Text to Speech):
 *   Windows (cmd):  set ELEVENLABS_API_KEY=مفتاحك
 * لا تضع المفتاح داخل أي ملف في المشروع.
 *
 * خيارات:
 *   --gender boy|girl|both   (الافتراضي both)
 *   --limit N                أقصى عدد جمل في هذا التشغيل (للتجربة ابدأ بـ 3)
 *   --voice ID               معرّف الصوت
 *   --dry-run                يعرض عدد الجمل وعدد الأحرف التقريبي دون توليد
 * متغيرات اختيارية: ELEVENLABS_MODEL (الافتراضي eleven_v4), ELEVENLABS_FORMAT (mp3_44100_64)
 * بعد التوليد:  npm run voices:sync
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VOICES_DIR = path.join(ROOT, 'public/audio/voices');
const MISSING = path.join(ROOT, 'scripts/voices/missing.json');

const args = process.argv.slice(2);
const flag = n => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const gender = opt('gender', 'both');
const limit = Number(opt('limit', '0')) || Infinity;
const voiceId = opt('voice', 'ZNWTizjpq2mvJDByKqIR');
const model = process.env.ELEVENLABS_MODEL || 'eleven_v4';
const format = process.env.ELEVENLABS_FORMAT || 'mp3_44100_64';
const apiKey = process.env.ELEVENLABS_API_KEY;

/** النقاط المتتالية تُقرأ كوقفة طويلة، فنستبدلها بفاصلة */
const forSpeech = t => t.replace(/\.{2,}|…/g, '،').replace(/\s+/g, ' ').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!fs.existsSync(MISSING)) {
  console.error('شغّل أولاً: npm run voices:sync');
  process.exit(1);
}

const todo = JSON.parse(fs.readFileSync(MISSING, 'utf8'))
  .filter(m => gender === 'both' || m.genders.includes(gender))
  .filter(m => !fs.existsSync(path.join(VOICES_DIR, `${m.key}.mp3`)))
  .slice(0, limit);

const chars = todo.reduce((a, m) => a + forSpeech(m.text).length, 0);
console.log(`المطلوب: ${todo.length} جملة، نحو ${chars} حرفاً (≈ ${chars} رصيداً)، الصوت ${voiceId}، النموذج ${model}`);
if (flag('dry-run')) process.exit(0);

if (!apiKey) {
  console.error('ضع المفتاح في ELEVENLABS_API_KEY (لا تحفظه في المشروع)');
  process.exit(1);
}

fs.mkdirSync(VOICES_DIR, { recursive: true });
let done = 0;

for (const item of todo) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${format}`;
  let ok = false;
  for (let attempt = 0; attempt < 3 && !ok; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: forSpeech(item.text),
        model_id: model,
        voice_settings: { stability: 0.6, similarity_boost: 0.8, speed: 0.92 },
      }),
    });
    if (res.ok) {
      fs.writeFileSync(path.join(VOICES_DIR, `${item.key}.mp3`), Buffer.from(await res.arrayBuffer()));
      done++;
      console.log(`  [${done}/${todo.length}] ${item.key}  ${item.text}`);
      ok = true;
    } else if (res.status === 429 && attempt < 2) {
      await sleep(5000 * (attempt + 1));
    } else {
      const body = (await res.text()).slice(0, 300);
      console.error(`\nتوقفت عند الحالة ${res.status}: ${body}`);
      if (res.status === 401) console.error('المفتاح غير صحيح أو ينقصه صلاحية Text to Speech.');
      if (res.status === 402 || /paid_plan|quota|credit/i.test(body)) {
        console.error('الرصيد انتهى أو الصوت يحتاج خطة مدفوعة. ما وُلّد محفوظ، وأعد الأمر لاحقاً.');
      }
      console.error(`المحفوظ في هذا التشغيل: ${done} مقطعاً.`);
      process.exit(done > 0 ? 0 : 1);
    }
  }
  await sleep(300);
}

console.log(`\nانتهى: ${done} مقطعاً. شغّل الآن: npm run voices:sync`);
