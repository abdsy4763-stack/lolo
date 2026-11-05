const LOCAL_AI_AUDIO: Record<string, string> = {
  'أهلاً يا صديقي! أنا لؤلؤ... كيف تشعر اليوم؟': '/audio/ai-arabic/welcome.wav',
  'المس وجه الشعور الذي تحس به الآن!': '/audio/ai-arabic/ask-emotion.wav',
  'ابتسامتك تنير يومنا يا بطل!': '/audio/ai-arabic/happy.wav',
  'أنا بجانبك دائماً... كل شيء سيكون بخير!': '/audio/ai-arabic/sad.wav',
  'لا بأس أن تغضب... سنلعب معاً ونهدأ خطوة بخطوة!': '/audio/ai-arabic/angry.wav',
  'أنا لؤلؤ شجاع معك... لا تخف يا صديقي!': '/audio/ai-arabic/afraid.wav',
  'اختر مغامرة لنلعبها معاً!': '/audio/ai-arabic/choose-stage.wav',
  'لعبنا كثيراً وأنت بطل رائع وصبور اليوم! حان وقت نوم الأسود الصغيرة لنرتاح ونلعب غداً... تصبح على خير!': '/audio/ai-arabic/sleep-time.wav',
  'شهيق... زفير! انفخ بالهواء لتساعد البالون أن يكبر!': '/audio/ai-arabic/breathing.wav',
  'البكاء يخرج الزعل، وبعده نجرّب سحرنا... أنا بجانبك دائماً!': '/audio/ai-arabic/hug.wav',
  'اختر حجة مقنعة لملء ألوان قوس الأمل الخمسة!': '/audio/ai-arabic/magic-instruction.wav',
  'القوس يبدأ بلون واحد، وكل حجة ذكية تملأ لوناً جديداً!': '/audio/ai-arabic/rainbow-guide.wav',
  'ماما الحبيبة... من فضلك، لو سمحتِ أرجوكِ؟': '/audio/ai-arabic/magic-please.wav',
  'ما رأيك أن نتفق: سآخذها بعد العشاء في الوقت المناسب؟ أعدك!': '/audio/ai-arabic/magic-promise.wav',
  'سأساعدكِ في ترتيب المكان أولاً، ثم تعطيني إياها بلطف؟': '/audio/ai-arabic/magic-help.wav',
  'أرجوكِ أرجوكِ أرجوكِ يا ماما، أرجوكِ أريدها الآن!': '/audio/ai-arabic/magic-begging.wav',
  'أنا زعلان وأريد أن أبكي...': '/audio/ai-arabic/magic-crying.wav',
  'أنت بطل التفاوض اللطيف! نجمة شجاعة لك على محاولتك الرائعة!': '/audio/ai-arabic/magic-reward.wav',
  'ليس الآن يا بطل، انتظر قليلاً حتى ينتهي وقت الساعة الرملية وسأعطيك المفاجأة!': '/audio/ai-arabic/hourglass-wait.wav',
  'انظر لحبات الرمل تنزل ببطء... المس الفقاعات الملونة لنفرقعها ونلعب بينما ننتظر!': '/audio/ai-arabic/hourglass-bubbles.wav',
  'اختر بديلاً ممتعاً لنلعب به في البيت!': '/audio/ai-arabic/planb-instruction.wav',
  'ما رأيك أن نضبط مؤقتاً سريعاً؟ دقيقة لك ودقيقة لي، ونتبادل الدور بالعدل!': '/audio/ai-arabic/sharing-timer.wav',
  'تعال لحضني... كل شيء سيكون بخير وأنا بجانبك دائماً!': '/audio/ai-arabic/empathy-hug.wav',
  'لا تحزن يا بطل! أنت قادر ومبدع وسنصنع شيئاً أروع معاً!': '/audio/ai-arabic/empathy-kind-words.wav',
  'أنت بطل شجاع ورائع! كل الزعل طار بعيداً، تعال لحضن دافئ!': '/audio/ai-arabic/balloon-hug.wav',
};

function normalizeAudioText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').replace(/\.{2,}/g, '...');
}

export function getLocalAiAudioUrl(text: string): string | null {
  return LOCAL_AI_AUDIO[normalizeAudioText(text)] || null;
}
