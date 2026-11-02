import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw, Heart, Sparkles, HandHeart, Smile, CheckCircle2 } from 'lucide-react';
import { SpeechSpeakerButton } from '../SpeechSpeakerButton';
import { DIALOGUES, formatDialogue } from '../../data/dialogue';
import { sound } from '../../utils/audio';
import { Storage } from '../../utils/storage';

interface StageEmpathyProps {
  onBack: () => void;
  onEarnStar: (sticker: string, note: string) => void;
}

export const StageEmpathy: React.FC<StageEmpathyProps> = ({
  onBack,
  onEarnStar,
}) => {
  const companion = Storage.getCompanionProfile();
  const settings = Storage.getSettings();

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isCured, setIsCured] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const situations = DIALOGUES.empathy.situations;
  const currentScenario = situations[scenarioIdx] || situations[0];

  const [currentPrompt, setCurrentPrompt] = useState<string>(
    formatDialogue(
      `${currentScenario.character}: "${currentScenario.sadVoice}"`,
      companion.name,
      'الأسد الصغير',
      settings.childGender
    )
  );

  useEffect(() => {
    const text = formatDialogue(
      `${DIALOGUES.empathy.intro} .. ${currentScenario.problem} .. كيف نساعد ${currentScenario.character}؟`,
      companion.name,
      'الأسد الصغير',
      settings.childGender
    );
    sound.speak(text);
    setCurrentPrompt(currentScenario.problem);
  }, [scenarioIdx]);

  const handleActionClick = (actionKey: string) => {
    sound.playTap();
    setSelectedAction(actionKey);

    const action = DIALOGUES.empathy.actions[actionKey as keyof typeof DIALOGUES.empathy.actions];
    if (!action) return;

    sound.playEmpathyHeartbeat();
    Storage.addLog({
      type: 'empathy_given',
      stageId: 'empathy',
      label: `تصرف تعاطف: ${action.title}`,
      detail: `${currentScenario.character} - ${action.title}`,
    });

    setCurrentPrompt(action.voice);

    // نطق تصرف الطفل ثم استجابة الشخصية السعيدة
    sound.speak(action.voice, () => {
      setIsCured(true);
      sound.playSuccessChime();
      setCurrentPrompt(currentScenario.happyVoice);

      confetti({
        particleCount: 55,
        spread: 80,
        origin: { y: 0.6 },
      });

      sound.speak(currentScenario.happyVoice, () => {
        setIsSuccess(true);
        sound.playTada();
        onEarnStar('💖', 'بطل الرحمة والتعاطف');
      }, 'praise_hero');
    }, actionKey === 'hug' ? 'warm_hug' : undefined);
  };

  const handleNext = () => {
    sound.playTap();
    setIsCured(false);
    setIsSuccess(false);
    setSelectedAction(null);
    setScenarioIdx(prev => (prev + 1) % situations.length);
  };

  const handleReplay = () => {
    sound.playTap();
    setIsCured(false);
    setIsSuccess(false);
    setSelectedAction(null);
    setCurrentPrompt(currentScenario.problem);
    sound.speak(currentScenario.problem);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 md:p-6 bg-gradient-to-b from-rose-50 via-purple-50 to-pink-100 overflow-x-hidden select-none">
      {/* الشريط العلوي */}
      <div className="flex items-center justify-between z-10">
        <button
          onClick={() => {
            sound.playTap();
            onBack();
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/90 hover:bg-white text-rose-950 font-black shadow-md border-2 border-rose-300 text-sm md:text-base touch-manipulation cursor-pointer"
        >
          <ArrowRight className="w-5 h-5" />
          <span>الرئيسية</span>
        </button>

        {/* مؤشر الموقف */}
        <div className="flex items-center gap-1.5 bg-white/90 px-3.5 py-1.5 rounded-full border-2 border-rose-200 shadow-xs">
          <HandHeart className="w-4 h-4 text-rose-600" />
          <span className="text-xs font-bold text-rose-900">
            موقف {scenarioIdx + 1} من {situations.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <SpeechSpeakerButton textToSpeak={currentPrompt} size="md" />
        </div>
      </div>

      {/* المشهد التفاعلي: الشخصية الحزينة ثم السعيدة */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 relative max-w-xl mx-auto w-full">
        {/* فقاعة الحديث */}
        <motion.div
          key={currentPrompt}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/95 rounded-3xl p-4 md:p-5 shadow-lg border-3 border-rose-300 max-w-lg text-center mb-4"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">{currentScenario.icon}</span>
            <h3 className="text-lg md:text-xl font-black text-rose-950">{currentScenario.title}</h3>
          </div>
          <p className="text-sm md:text-base font-bold text-slate-700 leading-relaxed">
            {currentPrompt}
          </p>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-r-3 border-b-3 border-rose-300 transform rotate-45" />
        </motion.div>

        {/* الشخصية المحتاجة للمساعدة */}
        <div className="relative my-4 flex flex-col items-center justify-center">
          <motion.div
            animate={
              isCured
                ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
                : { y: [0, -4, 0] }
            }
            transition={{ duration: 1.5, repeat: isCured ? 2 : Infinity }}
            className={`w-32 h-32 md:w-36 md:h-36 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 transition-all duration-700 ${
              isCured
                ? 'bg-gradient-to-tr from-amber-100 to-rose-100 border-amber-400 ring-8 ring-amber-200/50'
                : 'bg-gradient-to-tr from-slate-100 to-blue-100 border-blue-300 ring-8 ring-blue-100/50'
            }`}
          >
            <span className="text-6xl md:text-7xl filter drop-shadow-sm">
              {isCured ? '🥰' : currentScenario.icon}
            </span>
            <span className="text-xs font-black mt-1 px-3 py-0.5 rounded-full bg-white/90 text-slate-800 border border-slate-200">
              {currentScenario.character}
            </span>
          </motion.div>

          {/* قلوب تطفو عند نجاح التعاطف */}
          <AnimatePresence>
            {isCured && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: -20 }}
                exit={{ opacity: 0 }}
                className="absolute -top-6 flex gap-2 text-2xl"
              >
                <span>💖</span>
                <span>✨</span>
                <span>🌸</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* شريط الإشادة بالتعاطف */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full bg-rose-500 text-white rounded-3xl p-5 text-center shadow-xl border-4 border-white my-3 flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-7 h-7 text-amber-300 fill-amber-300 animate-pulse" />
                <span className="text-xl md:text-2xl font-black">أنت بطل التعاطف والرحمة!</span>
              </div>
              <p className="text-sm font-bold text-rose-100">
                تصرفك اللطيف مسح الحزن وأنار قلب صديقك ونلت نجمة شجاعة جديدة!
              </p>
              <div className="flex gap-2 w-full max-w-sm">
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 bg-white text-rose-800 hover:bg-rose-50 font-black rounded-2xl shadow text-sm flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <span>الموقف التالي</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={handleReplay}
                  className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow text-sm flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* بطاقات أفعال التعاطف الإيجابية */}
      {!isSuccess && !isCured && (
        <div className="w-full max-w-xl mx-auto space-y-2.5 z-10 pb-2">
          <p className="text-xs font-black text-rose-900 text-center mb-1">
            كيف تساعد {currentScenario.character} وتشعرها بالأمان؟
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* حضن دافئ وتطمين */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleActionClick('hug')}
              className="p-3.5 rounded-2xl bg-white hover:bg-rose-50 border-3 border-rose-300 shadow-md text-right flex items-center gap-3 cursor-pointer touch-manipulation transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center text-2xl shrink-0">
                🫂
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">حضن دافئ وتطمين</h4>
                <p className="text-xs text-slate-600 font-medium leading-tight">أنا بجانبك وكل شيء سيكون بخير</p>
              </div>
            </motion.button>

            {/* المساعدة العملية السريعة */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleActionClick('help')}
              className="p-3.5 rounded-2xl bg-white hover:bg-amber-50 border-3 border-amber-300 shadow-md text-right flex items-center gap-3 cursor-pointer touch-manipulation transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shrink-0">
                🧹
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">المساعدة العملية فوراً</h4>
                <p className="text-xs text-slate-600 font-medium leading-tight">نجمع ونرتب ونصلح معاً يداً بيد</p>
              </div>
            </motion.button>

            {/* كلمات طيبة وتشجيع */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleActionClick('kindWords')}
              className="p-3.5 rounded-2xl bg-white hover:bg-purple-50 border-3 border-purple-300 shadow-md text-right flex items-center gap-3 cursor-pointer touch-manipulation transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl shrink-0">
                ✨
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">كلمات طيبة وتشجيع</h4>
                <p className="text-xs text-slate-600 font-medium leading-tight">أنت بطل رائع وسنتجاوز هذا معاً</p>
              </div>
            </motion.button>

            {/* تقديم ماء أو مسح دموع */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleActionClick('waterOrSnack')}
              className="p-3.5 rounded-2xl bg-white hover:bg-sky-50 border-3 border-sky-300 shadow-md text-right flex items-center gap-3 cursor-pointer touch-manipulation transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-2xl shrink-0">
                🧻
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">تقديم منديل أو ماء</h4>
                <p className="text-xs text-slate-600 font-medium leading-tight">رعاية واهتمام براحة الآخرين</p>
              </div>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};
