/**
 * npm run voices:sync
 *
 * 1. يجمع كل الجمل المنطوقة من src/data (بصيغتي الولد والبنت، دون اسم الرفيق)
 *    مع الجمل الثابتة المكتوبة داخل المكوّنات، ومع scripts/voices/extra-lines.json.
 * 2. يحوّل المقاطع القديمة (scripts/voices/legacy-wav) إلى MP3 إذا طابقت جملة حالية.
 * 3. يكتب:
 *      public/audio/voices/manifest.json   المقاطع المتوفرة فعلاً (تقرأه اللعبة)
 *      scripts/voices/missing.json         الجمل التي تنقصها مقاطع (يقرأه voices:generate)
 *      scripts/voices/missing.md           نفس القائمة للقراءة البشرية
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DIALOGUES, formatDialogue } from '../../src/data/dialogue';
import { STORY_EPISODES } from '../../src/data/episodes';
import {
  COMPANION_DEFAULT_NAMES,
  ChildGender,
  fillPlaceholders,
  neutralizeSpoken,
  normalizeForKey,
  splitSegments,
  voiceKey,
} from '../../src/utils/voiceKey';
import { LEGACY_CLIPS } from './legacy-clips';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VOICES_DIR = path.join(ROOT, 'public/audio/voices');
const LEGACY_DIR = path.join(ROOT, 'scripts/voices/legacy-wav');
const EXTRA_FILE = path.join(ROOT, 'scripts/voices/extra-lines.json');

/** المفاتيح التي تحمل نصاً منطوقاً في ملفات البيانات */
const SPOKEN_KEYS = new Set([
  'text', 'voice', 'feedback', 'companionRequest', 'momInitial', 'compromiseProposal',
  'fullRewardPraise', 'compromiseAcceptedVoice', 'fullAcceptedVoice', 'intro', 'rewardPraise',
  'instruction', 'problem', 'sadVoice', 'happyVoice', 'praise', 'praiseCycle', 'friendVoice',
  'question', 'requiredAccessoryPrompt', 'greeting', 'askEmotion', 'happy', 'sad', 'angry',
  'afraid', 'chooseStage', 'rainbowGuide', 'level1', 'level2', 'level3', 'level4Compromise',
  'level5Full', 'beggingWarning', 'luluVoice', 'momWait', 'bubbleInstructions', 'momStatement',
  'calibrationText', 'blowInstruction', 'touchInstruction', 'idleHint', 'balloonFlown',
  'finalHug', 'step1', 'inhaleText', 'exhaleText', 'retryText', 'finalSuccess', 'reliefText',
  'hugVoice', 'luluHugResponse', 'body',
]);

/** جمل ثابتة مكتوبة داخل المكوّنات (أبقِها متطابقة مع الكود) */
const INLINE_LINES = [
  'المس الفقاعات بهدوء واجمع النجوم بلطف.',
  'وقت الاسترخاء يا {friend}. المس الفقاعات بهدوء واجمع النجوم بلطف.',
  'أنت هادئ ورائع! لقد جمعت الكثير من العملات الذهبية.',
  'لعبة الذاكرة! ابحث عن الأشكال المتطابقة يا {friend}.',
  'عمل رائع! ذاكرتك قوية جداً. لقد ربحت عملات ذهبية!',
  'هذا الصديق يحتاج إلى نجوم شجاعة لفتحه! العب واجمع النجوم!',
  'مرحباً! اختر اسماً لصديقك الجديد!',
  'يا له من اسم جميل!',
  'أهلاً بك يا {friend}!',
  'اختر شعوراً آخر لنطيره!',
  'هيا يا بطل، جرب سحر كلامك اللطيف لملء قوس الأمل!',
  'استخدم الكلمات السحرية لإقناعها!',
  'رن الجرس! حان دورك الآن يا بطل، تبادلتم اللعبة بعدل ومحبة!',
  'هدأ قلبك الجميل بحضن ماما.. والآن هيا نختار حلاً عادلاً!',
  'بدأ مؤقت تبادل الأدوار! انظر للثواني تمضي بسرعة!',
  'شهيق... املأ بطنك بالهواء',
  'زفير... أخرج الهواء ببطء وهدوء...',
  'اضغط مرة ثانية للشهيق',
  'والآن نأخذ نفساً ثانياً',
  'لقد انضم إلينا صديق جديد!',
];

const FEELINGS = ['حزين', 'غاضب', 'خائف'];

type Json = unknown;

/** يمر على كل النصوص تحت المفاتيح المنطوقة (المصفوفات تأخذ مفتاح أبيها) */
function collectSpoken(node: Json, key: string, trail: string[], out: string[]): void {
  if (typeof node === 'string') {
    const inSharing = trail.includes('sharing');
    if ((SPOKEN_KEYS.has(key) || (key === 'desc' && inSharing)) && /[؀-ۿ]/.test(node)) {
      out.push(node);
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach(item => collectSpoken(item, key, trail, out));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, Json>)) {
      collectSpoken(v, k, [...trail, k], out);
    }
  }
}

/** الجمل المركبة المحدودة التي تُبنى داخل المكوّنات من بيانات ثابتة */
function composedLines(): string[] {
  const out: string[] = [];
  const d = DIALOGUES as unknown as Record<string, any>;

  out.push(`ماما تقول: ${d.planB.momStatement}`);


  const situations: any[] = d.empathy?.situations ?? [];
  for (const sc of situations) out.push(`كيف نساعد ${sc.character}؟`);

  for (const f of FEELINGS) out.push(`صديقك يشعر أنه ${f} الآن..`);

  // خيارات المشاعر في StageBalloonBreathing (EMOTION_OPTIONS)
  for (const f of FEELINGS) out.push(`${f}؟ لا بأس. سنضعه داخل هذا البالون.`);
  return out;
}

function expandLine(raw: string): Array<{ gender: ChildGender; text: string }> {
  const genders: ChildGender[] = ['boy', 'girl'];
  return genders.map(gender => {
    const formatted = formatDialogue(raw, 'لؤلؤ', 'الأسد الشجاع', gender);
    const text = neutralizeSpoken(fillPlaceholders(formatted, gender), COMPANION_DEFAULT_NAMES, gender);
    return { gender, text };
  });
}

function main(): void {
  const raw: string[] = [];
  collectSpoken(DIALOGUES, '', [], raw);
  collectSpoken(STORY_EPISODES, '', [], raw);
  raw.push(...composedLines(), ...INLINE_LINES);
  if (fs.existsSync(EXTRA_FILE)) {
    const extra = JSON.parse(fs.readFileSync(EXTRA_FILE, 'utf8')) as string[] | Record<string, string>;
    raw.push(...(Array.isArray(extra) ? extra : Object.values(extra)));
  }

  // كل جملة تنقسم عند " .. " إلى مقاطع، ولكل مقطع مفتاحه
  const lines = new Map<string, { text: string; genders: Set<ChildGender> }>();
  for (const r of raw) {
    for (const { gender, text } of expandLine(r)) {
      for (const seg of splitSegments(text)) {
        const key = voiceKey(seg);
        const prev = lines.get(key);
        if (prev && normalizeForKey(prev.text) !== normalizeForKey(seg)) {
          throw new Error(`تصادم مفاتيح: "${prev.text}" و "${seg}"`);
        }
        if (prev) prev.genders.add(gender);
        else lines.set(key, { text: seg.trim(), genders: new Set([gender]) });
      }
    }
  }

  fs.mkdirSync(VOICES_DIR, { recursive: true });

  // مقاطع قديمة تطابق جملاً حالية
  let converted = 0;
  for (const clip of LEGACY_CLIPS) {
    const key = voiceKey(clip.text);
    const target = path.join(VOICES_DIR, `${key}.mp3`);
    const src = path.join(LEGACY_DIR, clip.file);
    if (lines.has(key) && !fs.existsSync(target) && fs.existsSync(src)) {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '24000', '-b:a', '48k', target]);
      converted++;
    }
  }

  const have: string[] = [];
  const missing: Array<{ key: string; text: string; genders: ChildGender[] }> = [];
  for (const [key, { text, genders }] of lines) {
    if (fs.existsSync(path.join(VOICES_DIR, `${key}.mp3`))) have.push(key);
    else missing.push({ key, text, genders: Array.from(genders).sort() });
  }
  have.sort();

  fs.writeFileSync(path.join(VOICES_DIR, 'manifest.json'), JSON.stringify({ clips: have }, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, 'scripts/voices/missing.json'), JSON.stringify(missing, null, 2) + '\n');
  fs.writeFileSync(
    path.join(ROOT, 'scripts/voices/missing.md'),
    `# جمل تنقصها مقاطع صوتية (${missing.length})\n\n` + missing.map((m, i) => `${i + 1}. \`${m.key}\` [${m.genders.join('+')}] — ${m.text}`).join('\n') + '\n'
  );

  console.log(`إجمالي المقاطع المطلوبة: ${lines.size}`);
  console.log(`متوفرة: ${have.length} (حُوّل ${converted} من القديمة الآن)`);
  console.log(`ناقصة: ${missing.length}  ->  scripts/voices/missing.md`);
  for (const g of ['boy', 'girl'] as ChildGender[]) {
    const n = missing.filter(m => m.genders.includes(g)).length;
    console.log(`  تلزم لإكمال اللعبة بصيغة ${g === 'boy' ? 'الولد' : 'البنت'} وحدها: ${n}`);
  }
}

main();
