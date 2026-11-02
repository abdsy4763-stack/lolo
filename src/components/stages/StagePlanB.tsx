import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw, CloudRain, Sparkles, MessageCircle } from 'lucide-react';
import { LuluCharacter, LuluMood } from '../LuluCharacter';
import { MotherCharacter } from '../MotherCharacter';
import { SpeechSpeakerButton } from '../SpeechSpeakerButton';
import { DIALOGUES, formatDialogue } from '../../data/dialogue';
import { sound } from '../../utils/audio';
import { Storage } from '../../utils/storage';
import { COMPANIONS_DATA } from '../CompanionCharacter';

interface StagePlanBProps {
  onBack: () => void;
  onEarnStar: (sticker: string, note: string) => void;
}

type PlanKey = 'tent' | 'drawing' | 'dance' | 'snack' | 'puzzle' | 'puppet';

export const StagePlanB: React.FC<StagePlanBProps> = ({
  onBack,
  onEarnStar,
}) => {
  const companion = Storage.getCompanionProfile();
  const companionDef = COMPANIONS_DATA[companion.type];

  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [luluMood, setLuluMood] = useState<LuluMood>('idle');
  const [speakerIcon, setSpeakerIcon] = useState<string>('👩‍👧');
  const [currentPrompt, setCurrentPrompt] = useState<string>(
    formatDialogue(`${DIALOGUES.planB.intro} .. ماما تقول: "${DIALOGUES.planB.momStatement}"`, companion.name, companionDef.title)
  );

  useEffect(() => {
    const text = formatDialogue(`${DIALOGUES.planB.intro} .. ماما تقول: ${DIALOGUES.planB.momStatement} .. ${DIALOGUES.planB.instruction}`, companion.name, companionDef.title);
    sound.speak(text);
  }, []);

  const handleSelectPlan = (key: PlanKey) => {
    sound.playTap();
    setSelectedPlan(key);
    const plan = DIALOGUES.planB.options[key];

    setLuluMood('happy');
    setSpeakerIcon(companionDef.emoji);
    const feedback = formatDialogue(plan.feedback, companion.name, companionDef.title);
    setCurrentPrompt(feedback);
    sound.playSuccessChime();

    confetti({
      particleCount: 65,
      spread: 75,
      origin: { y: 0.6 },
    });

    sound.speak(feedback, () => {
      sound.playTada();
      onEarnStar(plan.icon, 'بطل الخطة البديلة الذكية');
    });

    Storage.addLog({
      type: 'plan_b_picked',
      stageId: 'plan_b',
      label: `اختار خطة ب: ${plan.title}`,
      detail: plan.title,
    });
  };

  const handleRestart = () => {
    sound.playTap();
    setSelectedPlan(null);
    setLuluMood('idle');
    setSpeakerIcon('👩‍👧');
    const introText = `${DIALOGUES.planB.intro} .. ماما تقول: "${DIALOGUES.planB.momStatement}"`;
    setCurrentPrompt(introText);
    sound.speak(`${introText} .. ${DIALOGUES.planB.instruction}`);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 md:p-6 bg-gradient-to-b from-blue-100 via-amber-50 to-emerald-100 overflow-x-hidden select-none">
      {/* الشريط العلوي */}
      <div className="flex items-center justify-between z-10">
        <button
          onClick={() => {
            sound.playTap();
            onBack();
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/90 hover:bg-white text-amber-950 font-black shadow-md border-2 border-amber-300 text-sm md:text-base touch-manipulation cursor-pointer"
        >
          <ArrowRight className="w-5 h-5" />
          <span>الرئيسية</span>
        </button>

        <div className="flex items-center gap-3">
          <SpeechSpeakerButton textToSpeak={currentPrompt} size="md" />
        </div>
      </div>

      {/* المشهد التفاعلي: نافذة المطر، ماما، ولؤلؤ */}
      <div className="flex-1 flex flex-col items-center justify-center my-2 relative">
        {/* فقاعة الحديث الحالية بنص كبير وأيقونة مرافقة واضحة */}
        <motion.div
          key={currentPrompt}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 border-3 border-amber-300 rounded-3xl p-4 md:p-5 shadow-lg text-center max-w-lg w-full mb-3 flex items-center gap-3"
        >
          <span className="text-3xl md:text-4xl shrink-0 filter drop-shadow">
            {speakerIcon}
          </span>
          <p className="text-lg md:text-2xl font-black text-amber-950 leading-relaxed text-right flex-1">
            {currentPrompt}
          </p>
        </motion.div>

        {/* الشخصيات ونافذة المطر */}
        <div className="flex items-end justify-center gap-3 md:gap-6 my-2 w-full max-w-lg">
          {/* نافذة المطر في الخارج */}
          <div className="w-28 h-36 md:w-36 md:h-44 bg-sky-200/90 border-4 border-amber-800 rounded-2xl relative overflow-hidden shadow-inner flex flex-col items-center justify-center shrink-0">
            <CloudRain className="w-10 h-10 text-sky-600 animate-bounce mb-1" />
            <span className="text-[11px] font-black text-sky-900 bg-white/90 px-2 py-0.5 rounded-full">
              مطر غزير 🌧️
            </span>
            <div className="absolute inset-0 opacity-40 pointer-events-none bg-[repeating-linear-gradient(45deg,#38bdf8,#38bdf8_2px,transparent_2px,transparent_8px)]" />
          </div>

          {/* ماما اللبؤة مبتسمة ومحتوية */}
          <div className="flex flex-col items-center">
            <MotherCharacter mood="smiling" size="sm" />
            <span className="text-xs font-bold text-amber-900 mt-1">ماما الحبيبة</span>
          </div>

          {/* لؤلؤ يقفز فرحاً عند اختيار الخطة ب */}
          <div className="flex flex-col items-center">
            <LuluCharacter
              mood={selectedPlan ? 'happy' : luluMood}
              size="md"
            />
            <span className="text-xs font-bold text-amber-900 mt-1">{companion.name} البطل</span>
          </div>
        </div>

        {/* عرض النشاط المختار بنص وصورة كبيرة */}
        {selectedPlan && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-3 p-4 bg-white/95 rounded-3xl border-3 border-emerald-400 shadow-xl text-center max-w-sm flex items-center gap-3"
          >
            <div className="text-4xl animate-bounce">
              {DIALOGUES.planB.options[selectedPlan].icon}
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-600 block">نجحت الخطة البديلة! 🎉</span>
              <span className="text-base md:text-lg font-black text-slate-800">
                {DIALOGUES.planB.options[selectedPlan].title}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* خيارات الخطة ب الثلاثة بأيقونات كبيرة وأزرار ضخمة */}
      <div className="w-full max-w-xl mx-auto z-10">
        <AnimatePresence mode="wait">
          {!selectedPlan ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2.5"
            >
              {[
                { key: 'tent', color: 'bg-amber-400 text-amber-950', border: 'border-amber-200' },
                { key: 'drawing', color: 'bg-rose-400 text-white', border: 'border-rose-200' },
                { key: 'dance', color: 'bg-indigo-500 text-white', border: 'border-indigo-300' },
                { key: 'snack', color: 'bg-emerald-500 text-white', border: 'border-emerald-300' },
                { key: 'puzzle', color: 'bg-sky-500 text-white', border: 'border-sky-300' },
                { key: 'puppet', color: 'bg-purple-500 text-white', border: 'border-purple-300' },
              ].map(({ key, color, border }) => {
                const opt = DIALOGUES.planB.options[key as PlanKey];
                if (!opt) return null;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectPlan(key as PlanKey)}
                    className={`h-28 md:h-32 rounded-3xl ${color} p-2.5 flex flex-col items-center justify-center gap-1.5 shadow-md border-3 ${border} touch-manipulation cursor-pointer transition transform active:scale-95`}
                  >
                    <div className="text-3xl">{opt.icon}</div>
                    <span className="text-xs md:text-sm font-black text-center leading-tight">
                      {opt.title}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex gap-3 justify-center"
            >
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-6 py-4 rounded-3xl bg-white text-emerald-800 font-black text-base shadow-lg border-2 border-emerald-200 hover:bg-emerald-50 active:scale-95 touch-manipulation cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>اختر بديلاً آخر</span>
              </button>
              <button
                onClick={onBack}
                className="px-8 py-4 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg active:scale-95 touch-manipulation cursor-pointer"
              >
                العودة للرئيسية
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
