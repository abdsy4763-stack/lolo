import React, { useState, useEffect } from 'react';
import { X, Volume2, CheckCircle2, AlertTriangle, RefreshCw, Sparkles, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { audioManager, VoiceTestState } from '../utils/audio';

interface AudioTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioTestModal: React.FC<AudioTestModalProps> = ({ isOpen, onClose }) => {
  const [testState, setTestState] = useState<VoiceTestState | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const startTest = async () => {
    setIsRunning(true);
    await audioManager.runLiveVoiceTest(state => {
      setTestState(state);
      if (state.speechStatus === 'success' || state.speechStatus === 'error') {
        setIsRunning(false);
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      startTest();
    } else {
      setTestState(null);
      setIsRunning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showFallbackNotice = testState && (!testState.hasArabicVoice || testState.speechStatus === 'error');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-xl max-h-[92vh] bg-gradient-to-b from-white to-amber-50 rounded-3xl shadow-2xl p-5 md:p-6 flex flex-col overflow-hidden text-right border-4 border-amber-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow">
                <Volume2 className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-amber-950">فحص واختبار الصوت المباشر</h2>
                <p className="text-xs text-amber-800 font-bold">تقرير تفصيلي عن محرك الصوت والنطق في جهازك</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* محتوى النتائج بنص كبير وواضح */}
          <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-1 pl-1">
            {testState && (
              <>
                {/* 1. حالة AudioContext */}
                <div className="p-3.5 bg-white rounded-2xl border-2 border-slate-200 shadow-xs flex items-center justify-between">
                  <span className="text-sm md:text-base font-bold text-slate-700">
                    🔊 حالة سياق الصوت (AudioContext):
                  </span>
                  <span
                    className={`text-sm md:text-base font-black px-3 py-1 rounded-xl ${
                      testState.audioContextState === 'running'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {testState.audioContextState === 'running'
                      ? 'يعمل بنشاط (running) ✅'
                      : testState.audioContextState}
                  </span>
                </div>

                {/* 2. عدد الأصوات المتاحة */}
                <div className="p-3.5 bg-white rounded-2xl border-2 border-slate-200 shadow-xs flex items-center justify-between">
                  <span className="text-sm md:text-base font-bold text-slate-700">
                    🎙️ عدد الأصوات المكتشفة في متصفحك:
                  </span>
                  <span className="text-lg md:text-xl font-black text-indigo-700 bg-indigo-50 px-3.5 py-1 rounded-xl border border-indigo-200">
                    {testState.totalVoices} صوتاً
                  </span>
                </div>

                {/* 3. هل يوجد صوت عربي؟ */}
                <div className="p-3.5 bg-white rounded-2xl border-2 border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-bold text-slate-700">
                      🇸🇦 هل يوجد صوت عربي متاح؟
                    </span>
                    <span
                      className={`text-sm font-black px-3 py-1 rounded-xl ${
                        testState.hasArabicVoice
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {testState.hasArabicVoice ? 'نعم متوفر ✅' : 'غير متوفر مسبقاً ⚠️'}
                    </span>
                  </div>

                  {testState.hasArabicVoice ? (
                    <div className="text-xs md:text-sm font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>الصوت المختار: {testState.selectedVoiceName}</span>
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                      جهازك لا يحتوي على صوت نطق عربي مثبت مسبقاً. يعمل التطبيق عبر إظهار النصوص كبديل مرئي كامل دائماً.
                    </div>
                  )}
                </div>

                {/* 4. حالة نطق "مرحباً" ورسالة onerror إن وُجدت */}
                <div className="p-3.5 bg-white rounded-2xl border-2 border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-bold text-slate-700">
                      🗣️ حالة نطق كلمة "{testState.spokenText}":
                    </span>
                    <span
                      className={`text-xs md:text-sm font-black px-3 py-1 rounded-xl ${
                        testState.speechStatus === 'success'
                          ? 'bg-emerald-500 text-white'
                          : testState.speechStatus === 'speaking'
                          ? 'bg-amber-400 text-amber-950 animate-pulse'
                          : testState.speechStatus === 'error'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {testState.speechStatus === 'success' && 'تم النطق بنجاح! 🎉'}
                      {testState.speechStatus === 'speaking' && 'جاري النطق الآن... 🔊'}
                      {testState.speechStatus === 'starting' && 'بدء التشغيل...'}
                      {testState.speechStatus === 'error' && 'حدث خطأ في النطق ❌'}
                    </span>
                  </div>



                  {/* تفاصيل الخطأ في حال onerror */}
                  {testState.errorMessage && (
                    <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>تفاصيل الخطأ (onerror): {testState.errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* 5. تجربة الأصوات المسجلة والأهازيج */}
                <div className="p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border-2 border-emerald-300 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>الأصوات المسجلة والأهازيج التفاعلية:</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      مدعومة 100%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playPraiseChant();
                        audioManager.playSuccessChime();
                      }}
                      className="p-2 bg-white hover:bg-emerald-100 rounded-xl border border-emerald-200 text-center font-bold text-xs text-emerald-900 cursor-pointer shadow-xs transition"
                    >
                      <span>⭐ تشجيع الأبطال</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playSharingChime();
                      }}
                      className="p-2 bg-white hover:bg-teal-100 rounded-xl border border-teal-200 text-center font-bold text-xs text-teal-900 cursor-pointer shadow-xs transition"
                    >
                      <span>🤝 نغمة المشاركة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playEmpathyHeartbeat();
                      }}
                      className="p-2 bg-white hover:bg-rose-100 rounded-xl border border-rose-200 text-center font-bold text-xs text-rose-900 cursor-pointer shadow-xs transition"
                    >
                      <span>💖 نغمة التعاطف</span>
                    </button>
                  </div>
                </div>

                {/* 6. نص الحوار الاحتياطي للطفل */}
                <div className="p-4 bg-amber-100/90 border-3 border-amber-300 rounded-2xl shadow-inner space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                    <MessageSquare className="w-4 h-4 text-amber-700" />
                    <span>نص الحوار الاحتياطي للطفل (يظهر كبيراً دائماً):</span>
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border-2 border-amber-300 text-center shadow-xs">
                    <p className="text-xl md:text-2xl font-black text-amber-950 leading-relaxed">
                      "مرحباً يا بطل! أنا الأسد لؤلؤ.. كيف تشعر اليوم؟"
                    </p>
                  </div>
                  <p className="text-[11px] text-amber-800 font-bold leading-normal">
                    * هذا النص المرئي الاحتياطي يظهر تلقائياً في كل الحوارات والمراحل، حتى يستمر طفلك في التفاعل والفهم التام حتى لو كان الصوت صامتاً.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer أزرار التحكم */}
          <div className="pt-3 border-t-2 border-amber-200 flex gap-2.5 justify-between">
            <button
              onClick={startTest}
              disabled={isRunning}
              className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-black text-sm md:text-base flex items-center justify-center gap-2 shadow transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'جاري الاختبار والنطق...' : 'إعادة اختبار الصوت الآن'}</span>
            </button>
            <button
              onClick={onClose}
              className="py-3 px-6 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm md:text-base transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
