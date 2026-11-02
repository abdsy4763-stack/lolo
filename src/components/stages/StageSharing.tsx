import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw, Clock, Sparkles, Heart, Users, RefreshCw } from 'lucide-react';
import { CompanionCharacter, COMPANIONS_DATA } from '../CompanionCharacter';
import { SpeechSpeakerButton } from '../SpeechSpeakerButton';
import { DIALOGUES, formatDialogue } from '../../data/dialogue';
import { sound } from '../../utils/audio';
import { Storage } from '../../utils/storage';

interface StageSharingProps {
  onBack: () => void;
  onEarnStar: (sticker: string, note: string) => void;
}

export const StageSharing: React.FC<StageSharingProps> = ({
  onBack,
  onEarnStar,
}) => {
  const companion = Storage.getCompanionProfile();
  const companionDef = COMPANIONS_DATA[companion.type] || COMPANIONS_DATA.lion;
  const settings = Storage.getSettings();

  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null);
  const [isCrying, setIsCrying] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const rounds = DIALOGUES.sharing.rounds;
  const activeRound = rounds[currentRoundIdx] || rounds[0];

  const [currentPrompt, setCurrentPrompt] = useState<string>(
    formatDialogue(
      `${activeRound.title}: ${activeRound.desc}`,
      companion.name,
      companionDef.title,
      settings.childGender
    )
  );

  useEffect(() => {
    const text = formatDialogue(
      `${DIALOGUES.sharing.intro} .. ${activeRound.desc} .. ${DIALOGUES.sharing.instruction}`,
      companion.name,
      companionDef.title,
      settings.childGender
    );
    sound.speak(text, undefined, 'sharing_turn');
    setCurrentPrompt(formatDialogue(activeRound.desc, companion.name, companionDef.title, settings.childGender));
  }, [currentRoundIdx]);

  // تشغيل مؤقت العد التنازلي التفاعلي
  useEffect(() => {
    if (timerSeconds === null) return;
    if (timerSeconds > 0) {
      sound.playBalloonInflateTick();
      const timer = setTimeout(() => {
        setTimerSeconds(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // انتهى المؤقت وحان تبادل الدور
      sound.playSharingChime();
      sound.playSuccessChime();
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });
      const endText = "رن الجرس! حان دورك الآن يا بطل، تبادلتم اللعبة بعدل ومحبة!";
      setCurrentPrompt(endText);
      sound.speak(endText, () => {
        setIsSuccess(true);
        sound.playTada();
        onEarnStar('🤝', 'بطل تبادل الأدوار والمشاركة');
      }, 'praise_hero');
    }
  }, [timerSeconds]);

  const handlePickSolution = (solutionKey: string) => {
    sound.playTap();
    setSelectedSolution(solutionKey);

    const sol = DIALOGUES.sharing.solutions[solutionKey as keyof typeof DIALOGUES.sharing.solutions];
    if (!sol) return;

    if (solutionKey === 'crying') {
      setIsCrying(true);
      sound.playWarmHug();
      setCurrentPrompt(sol.feedback);
      Storage.addLog({
        type: 'crying_chosen',
        stageId: 'sharing',
        label: 'التعبير عن الضيق عند انتظار الدور',
        detail: activeRound.title,
      });

      sound.speak(sol.feedback, () => {
        setTimeout(() => {
          setIsCrying(false);
          setSelectedSolution(null);
          setCurrentPrompt("هدأ قلبك الجميل بحضن ماما.. والآن هيا نختار حلاً عادلاً!");
        }, 1200);
      }, 'warm_hug');
      return;
    }

    if (solutionKey === 'timer') {
      setCurrentPrompt("بدأ مؤقت تبادل الأدوار! انظر للثواني تمضي بسرعة!");
      setTimerSeconds(5); // 5 ثوانٍ ممتعة وسريعة للطفل
      sound.speak(sol.voice);
      Storage.addLog({
        type: 'sharing_solved',
        stageId: 'sharing',
        label: `حل المشاركة: ${sol.title}`,
        detail: activeRound.title,
      });
      return;
    }

    // الحلول الأخرى (لعب مشترك أو تبادل ألعاب)
    Storage.addLog({
      type: 'sharing_solved',
      stageId: 'sharing',
      label: `حل المشاركة: ${sol.title}`,
      detail: activeRound.title,
    });

    setCurrentPrompt(sol.feedback);
    sound.playSharingChime();

    confetti({
      particleCount: 60,
      spread: 75,
      origin: { y: 0.6 },
    });

    sound.speak(sol.feedback, () => {
      setIsSuccess(true);
      sound.playTada();
      onEarnStar('🤝', 'بطل المشاركة وتبادل الأدوار');
    }, 'praise_hero');
  };

  const handleNextRound = () => {
    sound.playTap();
    setIsSuccess(false);
    setSelectedSolution(null);
    setTimerSeconds(null);
    setCurrentRoundIdx(prev => (prev + 1) % rounds.length);
  };

  const handleReplay = () => {
    sound.playTap();
    setIsSuccess(false);
    setSelectedSolution(null);
    setTimerSeconds(null);
    setIsCrying(false);
    setCurrentPrompt(formatDialogue(activeRound.desc, companion.name, companionDef.title, settings.childGender));
    sound.speak(activeRound.desc, undefined, 'sharing_turn');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 md:p-6 bg-gradient-to-b from-teal-50 via-sky-50 to-emerald-100 overflow-x-hidden select-none">
      {/* الشريط العلوي */}
      <div className="flex items-center justify-between z-10">
        <button
          onClick={() => {
            sound.playTap();
            onBack();
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/90 hover:bg-white text-teal-950 font-black shadow-md border-2 border-teal-300 text-sm md:text-base touch-manipulation cursor-pointer"
        >
          <ArrowRight className="w-5 h-5" />
          <span>الرئيسية</span>
        </button>

        {/* مؤشر الجولات */}
        <div className="flex items-center gap-1.5 bg-white/90 px-3.5 py-1.5 rounded-full border-2 border-teal-200 shadow-xs">
          <Users className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-bold text-teal-900">
            موقف {currentRoundIdx + 1} من {rounds.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <SpeechSpeakerButton textToSpeak={currentPrompt} size="md" />
        </div>
      </div>

      {/* المشهد التفاعلي */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 relative max-w-xl mx-auto w-full">
        {/* فقاعة الحديث التوجيهية */}
        <motion.div
          key={currentPrompt}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/95 rounded-3xl p-4 md:p-5 shadow-lg border-3 border-teal-300 max-w-lg text-center mb-4"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">{activeRound.icon}</span>
            <h3 className="text-lg md:text-xl font-black text-teal-950">{activeRound.title}</h3>
          </div>
          <p className="text-sm md:text-base font-bold text-slate-700 leading-relaxed">
            {currentPrompt}
          </p>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-r-3 border-b-3 border-teal-300 transform rotate-45" />
        </motion.div>

        {/* شخصيات اللعب والمشاركة */}
        <div className="relative flex items-center justify-center gap-4 sm:gap-10 my-4">
          {/* شخصية الرفيق */}
          <div className="flex flex-col items-center">
            <CompanionCharacter
              mood={isCrying ? 'crying' : isSuccess ? 'happy' : 'idle'}
              size="md"
              type={companion.type}
            />
            <span className="text-xs font-bold text-teal-900 mt-1 bg-white/80 px-2.5 py-0.5 rounded-full border border-teal-200">
              {companion.name}
            </span>
          </div>

          {/* اللعبة المشتركة بينهما أو المؤقت */}
          <div className="flex flex-col items-center justify-center">
            {timerSeconds !== null ? (
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-20 h-20 rounded-full bg-amber-400 text-amber-950 flex flex-col items-center justify-center border-4 border-white shadow-xl"
              >
                <Clock className="w-6 h-6" />
                <span className="text-2xl font-black leading-none">{timerSeconds}</span>
              </motion.div>
            ) : (
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white shadow-xl border-3 border-teal-400 flex items-center justify-center text-4xl"
              >
                {activeRound.icon}
              </motion.div>
            )}
            <span className="text-[11px] font-black text-teal-800 mt-2 bg-teal-100/90 px-2 py-0.5 rounded-md">
              {timerSeconds !== null ? 'نتبادل بعد قليل!' : 'اللعبة المشتركة'}
            </span>
          </div>

          {/* شخصية الصديق/الأخ */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-amber-200 to-orange-200 border-4 border-amber-400 shadow-lg flex items-center justify-center text-4xl">
              👦
            </div>
            <span className="text-xs font-bold text-amber-950 mt-1 bg-white/80 px-2.5 py-0.5 rounded-full border border-amber-200">
              الصديق / الأخ
            </span>
          </div>
        </div>

        {/* احتفال النجاح */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full bg-emerald-500 text-white rounded-3xl p-5 text-center shadow-xl border-4 border-white my-3 flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-7 h-7 text-amber-300 animate-spin" />
                <span className="text-xl md:text-2xl font-black">اتفاق الأبطال ناجح 100%!</span>
              </div>
              <p className="text-sm font-bold text-emerald-100">
                المشاركة جعلت الجميع سعداء وربحت نجمة شجاعة جديدة!
              </p>
              <div className="flex gap-2 w-full max-w-sm">
                <button
                  onClick={handleNextRound}
                  className="flex-1 py-3 bg-white text-emerald-800 hover:bg-emerald-50 font-black rounded-2xl shadow text-sm flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <span>الموقف التالي</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={handleReplay}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow text-sm flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* خيارات الحلول العادلة والذكية */}
      {!isSuccess && timerSeconds === null && (
        <div className="w-full max-w-xl mx-auto space-y-2.5 z-10 pb-2">
          <p className="text-xs font-black text-teal-900 text-center mb-1">
            ما الحل الذكي الذي يقنع صديقك ويجعلكما سعيدين؟
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* خيار المؤقت الرملي */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePickSolution('timer')}
              className="p-3.5 rounded-2xl bg-white hover:bg-amber-50 border-3 border-amber-300 shadow-md text-right flex items-center gap-3 cursor-pointer touch-manipulation transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shrink-0">
                ⏳
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">مؤقت رملي عادل</h4>
                <p className="text-xs text-slate-600 font-medium leading-tight">دقيقة لك ودقيقة لي بالتبادل</p>
              </div>
            </motion.button>

            {/* خيار اللعب الجماعي */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePickSolution('playTogether')}
              className="p-3.5 rounded-2xl bg-white hover:bg-teal-50 border-3 border-teal-300 shadow-md text-right flex items-center gap-3 cursor-pointer touch-manipulation transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-2xl shrink-0">
                🤝
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">اللعب معاً في نفس اللعبة</h4>
                <p className="text-xs text-slate-600 font-medium leading-tight">نتسابق ونتعاون بصداقة</p>
              </div>
            </motion.button>

            {/* خيار تبادل الألعاب */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePickSolution('trade')}
              className="p-3.5 rounded-2xl bg-white hover:bg-sky-50 border-3 border-sky-300 shadow-md text-right flex items-center gap-3 cursor-pointer touch-manipulation transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-2xl shrink-0">
                🔄
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">تبادل الألعاب اللطيف</h4>
                <p className="text-xs text-slate-600 font-medium leading-tight">أعطيك لعبتي وأجرب لعبتك</p>
              </div>
            </motion.button>

            {/* خيار الحزن والحضن */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePickSolution('crying')}
              className="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border-3 border-rose-300 shadow-md text-right flex items-center gap-3 cursor-pointer touch-manipulation transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-200 text-rose-700 flex items-center justify-center text-2xl shrink-0">
                😢
              </div>
              <div>
                <h4 className="font-black text-rose-900 text-sm">أشعر بالحزن وأريد حضناً</h4>
                <p className="text-xs text-rose-700 font-medium leading-tight">أهدأ أولاً بحضن ماما ثم نتفق</p>
              </div>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};
