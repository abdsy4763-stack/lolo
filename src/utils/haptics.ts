/**
 * مدير الاستجابة اللمسية (Haptics Manager)
 * يوفر أنماط اهتزاز مختلفة لتعزيز تفاعل الطفل مع اللعبة
 */

export const haptics = {
  /**
   * الدالة الأساسية لتشغيل الاهتزاز بأمان
   */
  vibrate: (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // تجاهل الخطأ بصمت إذا كان الجهاز أو المتصفح لا يدعم الميزة
      }
    }
  },

  /** نقرة خفيفة جداً (للأزرار العادية) */
  tap: () => haptics.vibrate(10),

  /** اهتزاز الفرقعة (لفقع الفقاعات في الساعة الرملية) - اهتزاز سريع ومزدوج */
  pop: () => haptics.vibrate([15, 30, 15]),

  /** اهتزاز متقطع وخفيف جداً (يحاكي الشد عند نفخ البالون) */
  inflateTick: () => haptics.vibrate(8),

  /** اهتزاز النجاح أو الاحتفال (عند إكمال مرحلة) */
  success: () => haptics.vibrate([30, 50, 40, 50, 50]),

  /** اهتزاز الخطأ (عند إدخال رقم خاطئ في بوابة الوالدين) */
  error: () => haptics.vibrate([50, 50, 50]),
};