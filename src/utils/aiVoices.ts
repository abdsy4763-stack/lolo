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
};

function normalizeAudioText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').replace(/\.{2,}/g, '...');
}

export function getLocalAiAudioUrl(text: string): string | null {
  return LOCAL_AI_AUDIO[normalizeAudioText(text)] || null;
}
