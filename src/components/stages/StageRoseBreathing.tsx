import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw, Heart, Wind, Sparkles } from 'lucide-react';
import { LuluCharacter, LuluMood } from '../LuluCharacter';
import { SpeechSpeakerButton } from '../SpeechSpeakerButton';
import { DIALOGUES, formatDialogue } from '../../data/dialogue';
import { sound } from '../../utils/audio';
import { Storage } from '../../utils/storage';
import { COMPANIONS_DATA } from '../CompanionCharacter';

interface StageRoseBreathingProps {
  onBack: () => void;
  onEarnStar: (sticker: string, note: string) => void;
}

const INHALE_DURATION_MS = 5000; // 5 ثوانٍ كاملة حسب المطلوب
const REQUIRED_CYCLES = 3;

export const StageRoseBreathing: React.FC<StageRoseBreathingProps> = ({
  onBack,
  onEarnStar,
}) => {
  const companion = Storage.getCompanionProfile();
  const companionDef = COMPANIONS_DATA[companion.type];

  const [cycleIndex, setCycleIndex] = useState(0); // 0, 1, 2
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0); // 0 to 1
  const [phase, setPhase] = useState<'idle' | 'inhale' | 'exhale' | 'finished'>('idle');
  const [currentPrompt, setCurrentPrompt] = useState<string>(
    formatDialogue(DIALOGUES.roseBreathing.intro, companion.name, companionDef.title)
  );
  const [luluMood, setLuluMood] = useState<LuluMood>('idle');

  const pressStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const text = formatDialogue(`${DIALOGUES.roseBreathing.intro} .. ${DIALOGUES.roseBreathing.step1}`, companion.name, companionDef.title);
    sound.speak(text);
  }, []);

  const handlePointerDown = () => {
    if (phase === 'exhale' || phase === 'finished') return;

    sound.playTap();
    setIsPressing(true);
    setPhase('inhale');
    setLuluMood('idle');
    pressStartRef.current = Date.now();
    setCurrentPrompt(DIALOGUES.roseBreathing.inhaleText);
    sound.playBreatheTone('inhale');
    sound.speak("شهيق... املأ بطنك بالهواء");

    const updateLoop = () => {
      if (!pressStartRef.current) return;
      const elapsed = Date.now() - pressStartRef.current;
      const progress = Math.min(1, elapsed / INHALE_DURATION_MS);
      setPressProgress(progress);

      if (progress >= 1) {
        completeCycle();
      } else {
        animationFrameRef.current = requestAnimationFrame(updateLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateLoop);
  };

  const handlePointerUpOrLeave = () => {
    if (phase !== 'inhale') return;

    setIsPressing(false);
    pressStartRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // إذا رفع إصبعه مبكراً: لا خسارة، تعود الوردة بلطف ويقول لؤلؤ "نجرّب مرة ثانية معاً"
    setPressProgress(0);
    setPhase('idle');
    setCurrentPrompt(DIALOGUES.roseBreathing.retryText);
    sound.speak(DIALOGUES.roseBreathing.retryText);
  };

  const completeCycle = () => {
    setIsPressing(false);
    pressStartRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setPhase('exhale');
    setCurrentPrompt(DIALOGUES.roseBreathing.exhaleText);
    sound.playBreatheTone('exhale');
    sound.speak("زفير... أخرج الهواء ببطء وهدوء...");

    setTimeout(() => {
      const nextCycle = cycleIndex + 1;
      setCycleIndex(nextCycle);
      setPressProgress(0);

      if (nextCycle >= REQUIRED_CYCLES) {
        // اكتملت الدورات الثلاث: يتنفس لؤلؤ بارتياح ويبتسم
        setPhase('finished');
        setLuluMood('happy');
        setCurrentPrompt(DIALOGUES.roseBreathing.reliefText);
        sound.playSuccessChime();

        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.5 },
        });

        sound.speak(`${DIALOGUES.roseBreathing.reliefText} .. ${DIALOGUES.roseBreathing.finalSuccess}`, () => {
          sound.playTada();
          onEarnStar('🌹', 'بطل الهدوء والتنفس العميق');
        });

        Storage.addLog({
          type: 'rose_completed',
          stageId: 'rose_breathing',
          label: 'أكمل تمرين تنفس الوردة 3 مرات',
          detail: '3 دورات شهيق وزفير 5 ثوانٍ',
        });
      } else {
        setPhase('idle');
        const praise = DIALOGUES.roseBreathing.praiseCycle[nextCycle - 1];
        setCurrentPrompt(`${praise} .. اضغط مرة ثانية للشهيق`);
        sound.speak(`${praise} .. والآن نأخذ نفساً ثانياً`);
      }
    }, 4500);
  };

  const handleRestart = () => {
    sound.playTap();
    setCycleIndex(0);
    setIsPressing(false);
    setPressProgress(0);
    setPhase('idle');
    setLuluMood('idle');
    setCurrentPrompt(DIALOGUES.roseBreathing.intro);
    sound.speak(`${DIALOGUES.roseBreathing.intro} .. ${DIALOGUES.roseBreathing.step1}`);
  };

  const petalScale = 0.5 + (cycleIndex * 0.2) + (phase === 'inhale' ? pressProgress * 0.25 : 0);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 md:p-6 bg-gradient-to-b from-rose-100 via-amber-50 to-emerald-100 overflow-x-hidden select-none">
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

        {/* مؤشر الدورات المكتملة 3 مرات */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white/95 rounded-full border-2 border-rose-300 text-rose-900 font-bold shadow text-sm">
          <span>التنفسات:</span>
          <div className="flex gap-1.5 text-lg">
            {[0, 1, 2].map(i => (
              <span key={i} className={`transition-all duration-300 ${i < cycleIndex ? 'scale-110 opacity-100 filter drop-shadow' : 'opacity-30'}`}>
                🌹
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SpeechSpeakerButton textToSpeak={currentPrompt} size="md" />
        </div>
      </div>

      {/* منطقة تفتح الوردة والتنفس */}
      <div className="flex-1 flex flex-col items-center justify-center my-2 relative">
        {/* فقاعة الحديث الحالية بنص كبير وأيقونة مرافقة واضحة */}
        <motion.div
          key={currentPrompt}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 border-3 border-rose-300 rounded-3xl p-4 md:p-5 shadow-lg text-center max-w-lg w-full mb-3 flex items-center gap-3"
        >
          <span className="text-3xl md:text-4xl shrink-0 filter drop-shadow">
            {phase === 'inhale' ? '🌬️' : phase === 'exhale' ? '🍃' : phase === 'finished' ? '🦁' : '🌹'}
          </span>
          <p className="text-xl md:text-3xl font-black text-rose-950 leading-relaxed text-right flex-1">
            {currentPrompt}
          </p>
        </motion.div>

        {/* مؤشر شهيق وزفير بالتناوب بنص ضخم جداً */}
        <div className="h-14 flex items-center justify-center my-1">
          <AnimatePresence mode="wait">
            {phase === 'inhale' && (
              <motion.div
                key="inhale-badge"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="px-6 py-2 rounded-full bg-sky-500 text-white font-black text-2xl shadow-lg flex items-center gap-2 border-2 border-sky-300"
              >
                <Wind className="w-6 h-6 animate-pulse" />
                <span>شهيق... (5 ثوانٍ)</span>
              </motion.div>
            )}

            {phase === 'exhale' && (
              <motion.div
                key="exhale-badge"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.05, 1], opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="px-6 py-2 rounded-full bg-emerald-500 text-white font-black text-2xl shadow-lg flex items-center gap-2 border-2 border-emerald-300"
              >
                <Sparkles className="w-6 h-6 animate-spin" />
                <span>زفير... (استرخِ)</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* الوردة التفاعلية الكبيرة القابلة للضغط والتثبيت */}
        <div className="relative flex flex-col items-center my-3">
          {/* هالة التوهج المتسعة مع التقدم */}
          <motion.div
            style={{
              transform: `scale(${1 + pressProgress * 0.45})`,
              opacity: isPressing ? 0.85 : 0.2,
            }}
            className="absolute inset-0 -m-8 rounded-full bg-rose-400/40 blur-2xl pointer-events-none transition-opacity"
          />

          {/* زر الوردة التفاعلي الضخم (200px+) */}
          <motion.div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUpOrLeave}
            onPointerLeave={handlePointerUpOrLeave}
            animate={{
              scale: isPressing ? 1.06 : [1, 1.02, 1],
            }}
            transition={{
              duration: isPressing ? 0.2 : 2.5,
              repeat: isPressing ? 0 : Infinity,
              ease: 'easeInOut',
            }}
            className="w-52 h-52 md:w-60 md:h-60 rounded-full bg-gradient-to-b from-rose-50 to-rose-200 border-4 border-rose-400 shadow-2xl flex flex-col items-center justify-center cursor-pointer touch-manipulation active:scale-95 relative overflow-hidden select-none"
          >
            {/* شريط تعبئة دائري للوقت خلال 5 ثوانٍ */}
            <div
              style={{ height: `${pressProgress * 100}%` }}
              className="absolute bottom-0 inset-x-0 bg-rose-400/35 transition-all duration-75 pointer-events-none"
            />

            {/* الوردة بتدرج SVG نقي يكبر ويتفتح */}
            <div className="relative z-10 w-36 h-36 md:w-40 md:h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                {/* الساق والورقتان */}
                <path d="M 50 75 Q 48 95 50 100" stroke="#16A34A" strokeWidth="5" fill="none" strokeLinecap="round" />
                <path d="M 50 82 Q 35 78 30 85 Q 42 90 50 85" fill="#22C55E" />
                <path d="M 50 85 Q 65 80 70 87 Q 58 92 50 88" fill="#22C55E" />

                {/* البتلات تتفتح وتكبر */}
                <g transform={`translate(50, 50) scale(${petalScale}) translate(-50, -50)`}>
                  <ellipse cx="38" cy="46" rx="14" ry="20" fill="#FB7185" transform="rotate(-25 38 46)" />
                  <ellipse cx="62" cy="46" rx="14" ry="20" fill="#FB7185" transform="rotate(25 62 46)" />
                  <ellipse cx="50" cy="38" rx="15" ry="18" fill="#F43F5E" />
                  <circle cx="50" cy="50" r="16" fill="#E11D48" />
                  <ellipse cx="50" cy="48" rx="10" ry="8" fill="#BE123C" />
                  <path d="M 45 48 Q 50 54 55 48" stroke="#FFE4E6" strokeWidth="2.5" fill="none" />
                </g>
              </svg>
            </div>

            {/* إرشاد الضغط والتثبيت */}
            <span className="relative z-10 text-xs md:text-sm font-black text-rose-950 mt-1 bg-white/80 px-3.5 py-1 rounded-full shadow-xs">
              {phase === 'inhale' ? 'استمر بالضغط... 💨' : phase === 'exhale' ? 'زفير مريح... 🌸' : 'اضغط وثبّت إصبعك 👆'}
            </span>
          </motion.div>

          {/* رفيق الطفل في الأسفل: يتنفس بارتياح ويبتسم في النهاية */}
          <div className="mt-4 flex items-center gap-2.5">
            <LuluCharacter mood={luluMood} size="sm" />
            <span className="text-xs md:text-sm font-black text-amber-900 bg-white/90 px-4 py-1.5 rounded-full border border-amber-300 shadow-xs">
              {phase === 'finished' ? `${companion.name} يتنفس بارتياح ويبتسم بسعادة! ${companionDef.emoji}😊` : `${companion.name} يتنفس معك بهدوء!`}
            </span>
          </div>
        </div>
      </div>

      {/* الشريط السفلي */}
      <div className="w-full max-w-md mx-auto z-10">
        {phase === 'finished' ? (
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-6 py-4 rounded-3xl bg-white text-emerald-800 font-black text-base shadow-lg border-2 border-emerald-200 hover:bg-emerald-50 active:scale-95 touch-manipulation cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>تنفس مجدداً</span>
            </button>
            <button
              onClick={onBack}
              className="px-8 py-4 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg active:scale-95 touch-manipulation cursor-pointer"
            >
              العودة للرئيسية
            </button>
          </div>
        ) : (
          <div className="p-3 bg-white/85 rounded-2xl text-center text-xs md:text-sm font-black text-rose-950 border border-rose-200 shadow-sm flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>إذا رفعت إصبعك مبكراً فلا بأس، نجرّب مرة ثانية معاً بكل هدوء!</span>
          </div>
        )}
      </div>
    </div>
  );
};
