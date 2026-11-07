/**
 * أدوات مشتركة بين اللعبة وسكربتات الأصوات (scripts/voices).
 * لا تعتمد على React ولا على المتصفح حتى تعمل في Node أيضاً.
 *
 * الفكرة: كل جملة منطوقة لها "مفتاح" ثابت يُحسب من نصها بعد التطبيع
 * (إزالة التشكيل والعلامات والإيموجي)، واسم ملفها الصوتي هو المفتاح نفسه:
 *   /audio/voices/<key>.mp3
 * فلا حاجة لمطابقة النص حرفياً، وتغيير علامة ترقيم لا يكسر الربط.
 */

/** الأسماء الافتراضية للرفقاء. يجب أن تطابق COMPANIONS_DATA في CompanionCharacter.tsx */
export const COMPANION_DEFAULT_NAMES = ['لؤلؤ', 'فستق', 'بامبو', 'ثعلوب', 'فلفول', 'بسبوسة', 'دينو'];

export type ChildGender = 'boy' | 'girl';

/** الصيغ المتغيرة حسب جنس الطفل (نفس القيم المستخدمة في formatDialogue) */
export function genderWords(gender: ChildGender = 'boy') {
  const girl = gender === 'girl';
  return {
    hero: girl ? 'بطلة' : 'بطل',
    friend: girl ? 'صديقتي' : 'صديقي',
    brave: girl ? 'شجاعة' : 'شجاع',
    patient: girl ? 'صبورة' : 'صبور',
  };
}

/** يملأ أي {hero} أو {friend}... لم تُستبدل قبل وصول النص إلى الصوت */
export function fillPlaceholders(text: string, gender: ChildGender = 'boy'): string {
  const w = genderWords(gender);
  return text
    .replace(/\{hero\}/g, w.hero)
    .replace(/\{friend\}/g, w.friend)
    .replace(/\{brave\}/g, w.brave)
    .replace(/\{patient\}/g, w.patient);
}

const AR_LETTERS = '\\u0621-\\u064A';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * يحوّل أسماء الرفقاء داخل الجملة إلى كلمة عامة ("صديقك")،
 * بحيث يصلح مقطع صوتي واحد لكل الرفقاء ولا يحتاج اسماً مسجلاً.
 *  - "يا فستق"  ->  "يا صديقي" / "يا صديقتي"
 *  - "للؤلؤ"    ->  "لصديقك"  (تبقى السابقة: و ب ل ف ك)
 */
export function neutralizeSpoken(text: string, names: string[], gender: ChildGender = 'boy'): string {
  const friend = genderWords(gender).friend;
  const unique = Array.from(new Set(names.map(n => (n || '').trim()).filter(n => n.length >= 2)));
  unique.sort((a, b) => b.length - a.length);

  let out = text;
  for (const name of unique) {
    const n = escapeRegExp(name);
    out = out.replace(
      new RegExp(`(^|[^${AR_LETTERS}])يا\\s+${n}(?![${AR_LETTERS}])`, 'g'),
      `$1يا ${friend}`
    );
    out = out.replace(
      new RegExp(`(^|[^${AR_LETTERS}])([وبلفك]?)${n}(?![${AR_LETTERS}])`, 'g'),
      (_m, pre: string, prefix: string) => `${pre}${prefix}صديقك`
    );
  }
  return out;
}

/** تطبيع النص قبل حساب المفتاح: حروف عربية وأرقام فقط، دون تشكيل أو علامات */
export function normalizeForKey(text: string): string {
  return text
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[^ء-ي0-9٠-٩A-Za-z]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** cyrb53: دالة تجزئة سريعة بـ 53 بت، تعطي نتيجة ثابتة في المتصفح وNode */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** المفتاح الثابت للجملة (14 خانة سداسية عشرية) */
export function voiceKey(text: string): string {
  return cyrb53(normalizeForKey(text)).toString(16).padStart(14, '0');
}

/**
 * الجمل المركبة في الكود تُفصل بـ " .. " (مسافة نقطتان مسافة).
 * كل جزء له مقطعه الخاص، فتُشغَّل المقاطع بالتتابع.
 */
export function splitSegments(text: string): string[] {
  return text
    .split(/\s+\.\.\s+/)
    .map(s => s.trim())
    .filter(s => normalizeForKey(s).length > 0);
}
