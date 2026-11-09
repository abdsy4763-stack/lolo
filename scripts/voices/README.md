# نظام أصوات اللعبة

لا يوجد أي صوت آلي في اللعبة. كل جملة تُشغَّل من ملف MP3 ثابت في `public/audio/voices/`،
واسم الملف هو مفتاح مأخوذ من نص الجملة (`src/utils/voiceKey.ts`).
الجملة التي ليس لها ملف تبقى مكتوبة على الشاشة ويكمل التدفق بعد مدة قراءة قصيرة.

## الأوامر

```bash
npm run voices:sync        # يجمع الجمل المطلوبة، يحدّث manifest.json، ويكتب قائمة الناقص
npm run voices:generate -- --gender boy --limit 60   # يولّد الناقص (يتخطى الموجود، ويمكن استئنافه)
node scripts/voices/test-split.mjs                    # يختبر قصّ الصوت على المقاطع القديمة
```

`voices:generate` يحتاج مرة واحدة:
`npm install --no-save @google/genai @breezystack/lamejs` ومفتاحاً مجانياً `GEMINI_API_KEY` من Google AI Studio.
يعمل على جهازك قبل النشر فقط؛ اللعبة نفسها لا تستدعي أي API.

### ElevenLabs (الموصى به عند التخطيط لاستخدام تجاري)

```bash
set ELEVENLABS_API_KEY=مفتاحك        # Windows cmd
npm run voices:generate:eleven -- --gender boy --dry-run   # يعرض العدد والأحرف
npm run voices:generate:eleven -- --gender boy --limit 3   # تجربة
npm run voices:generate:eleven -- --gender boy             # الكل
```
الصوت الافتراضي Laloosh. أصوات المكتبة عبر API تتطلب خطة مدفوعة، والترخيص التجاري يتطلب خطة مدفوعة (تحقق من شروط ElevenLabs).

### الحصة المجانية (Gemini)

الطبقة المجانية تحدّد **عدد الطلبات** (نحو 10 يومياً و3 في الدقيقة لنموذج الصوت)، وليس طول النص.
الافتراضي جملة لكل طلب، والسكربت ينتظر 21 ثانية بين الطلبات، ويتوقف بهدوء عند نفاد الحصة، ويكمل في المرة التالية.
`--batch N` (أكثر من جملة في طلب ثم القصّ عند الصمت) تجريبي ولا يُنصح به: الخدمة الفعلية تتوقف بطول متقارب
عند كل علامة تعجب وفاصلة، فيلتبس القصّ وتُرفض أغلب الدفعات فيضيع الطلب. كل دفعة خام تُحفظ في
`scripts/voices/raw-batches` (غير مرفوعة إلى GitHub) لتشخيص ذلك دون إهدار الحصة.
لإكمال المقاطع بسرعة فعّل الفوترة على المشروع مع حد إنفاق، أو وزّع التوليد على عدة أيام.

## إضافة جملة جديدة

1. اكتبها في `src/data/dialogue.ts` أو `episodes.ts` (أو في المكوّن إن كانت ثابتة)، دون اسم الطفل أو الرفيق.
2. `npm run voices:sync` ثم `npm run voices:generate`.

## جمل لم يلتقطها الاستخراج

شغّل اللعبة بوضع التطوير (`npm run dev`) والعب كل المراحل. ستظهر في الكونسول رسائل `[voice-missing]`.
انسخ القائمة بالأمر `copy(JSON.stringify(window.__voiceMissing, null, 2))` واحفظها في
`scripts/voices/extra-lines.json` ثم شغّل `voices:sync`.

## المؤثرات

`public/audio/sfx/` تسجيلات من حزمة Kenney UI Audio بترخيص CC0 (انظر ملف الترخيص هناك).
الأسماء المستخدمة معرّفة في `SAMPLE_FILES` أعلى `src/utils/audio.ts`.

## المقاطع القديمة

الـ25 مقطعاً الأصلية محفوظة في `scripts/voices/legacy-wav` (خارج حزمة اللعبة).
أُعيد استخدام ما لا يحتوي اسماً منها، والباقي يُعاد توليده بصيغة بلا اسم.
