import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw, Sparkles, Pause, Play } from 'lucide-react';
import { LuluCharacter, LuluMood } from '../LuluCharacter';
import { SpeechSpeakerButton } from '../SpeechSpeakerButton';
import { DIALOGUES, formatDialogue } from '../../data/dialogue';
import { sound } from '../../utils/audio';
import { Storage } from '../../utils/storage';
import { COMPANIONS_DATA } from '../CompanionCharacter';
import { haptics } from '../../utils/haptics'; // إضافة مكتبة اللمس

interface Bubble {
  id: number;
  x: number; // percentage 10% - 90%
  color: string;
  size: number;
  speed: number;
  symbol: string;
}

interface StageHourglassProps {
  onBack: () => void;
  onEarnStar: (sticker: string, note: string) => void;
}

const TOTAL_WAIT_SECONDS = 12;

export const StageHourglass: React.FC<StageHourglassProps> = ({
  onBack,
  onEarnStar,
}) => {
  const companion = Storage.getCompanionProfile();
  const companionDef = COMPANIONS_DATA[companion.type];

  const [secondsLeft, setSecondsLeft] = useState(TOTAL_WAIT_SECONDS);
  const [isFinished, setIsFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [poppedCount, setPoppedCount] = useState(0);
  const [luluMood, setLuluMood] = useState<LuluMood>('idle');
  const [currentPrompt, setCurrentPrompt] = useState<string>(
    formatDialogue(DIALOGUES.hourglass.momWait, companion.name, companionDef.title)
  );

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubbleIdRef = useRef(1);

  useEffect(() => {
    const text = formatDialogue(`${DIALOGUES.hourglass.momWait} .. ${DIALOGUES.hourglass.bubbleInstructions}`, companion.name, companionDef.title);
    sound.speak(text);
  }, []);

  useEffect(() => {
    if (isFinished || isPaused) return;
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinished, isPaused]);

  useEffect(() => {
    if (isFinished || isPaused) return;
    const interval = setInterval(() => {
      setBubbles(prev => {
        if (prev.length >= 6) return prev;
        const colors = ['#38BDF8', '#818CF8', '#F472B6', '#34D399', '#FBBF24'];
        const symbols = ['✨', '🫧', '🌟', '💖', '💧'];
        const newBubble: Bubble = {
          id: bubbleIdRef.current++,
          x: 15 + Math.random() * 70,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 65 + Math.random() * 25,
          speed: 4 + Math.random() * 2,
          symbol: symbols[Math.floor(Math.random() * symbols.length)],
        };
        return [...prev, newBubble];
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [isFinished, isPaused]);

  const triggerCompletion = () => {
    setIsFinished(true);
    setLuluMood('happy');
    setCurrentPrompt(DIALOGUES.hourglass.timeUpSuccess.voice);
    sound.playSuccessChime();
    haptics.success(); // اهتزاز النجاح
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.5 },
    });
    sound.speak(DIALOGUES.hourglass.timeUpSuccess.voice, () => {
      sound.playTada();
      onEarnStar('⏳', 'انتظر بصبر واستمتع بوقته!');
    });
    Storage.addLog({
      type: 'hourglass_waited',
      stageId: 'hourglass',
      label: 'أكمل تمرين الساعة الرملية',
      detail: `فرقع ${poppedCount} فقاعات وانتظر 12 ثانية بنجاح.`
    });
  };

  const handlePopBubble = (id: number) => {
    sound.playBubblePop();
    haptics.pop(); // اهتزاز فيزيائي ممتع مع كل فقاعة
    setPoppedCount(prev => prev + 1);
    setBubbles(prev => prev.filter(b => b.id !== id));
  };

  const handleRestart = () => {
    sound.playTap();
    haptics.tap();
    setSecondsLeft(TOTAL_WAIT_SECONDS);
    setIsFinished(false);
    setIsPaused(false);
    setPoppedCount(0);
    setBubbles([]);
    setLuluMood('idle');
    setCurrentPrompt(DIALOGUES.hourglass.momWait);
    sound.speak(`${DIALOGUES.hourglass.momWait} .. ${DIALOGUES.hourglass.bubbleInstructions}`);
  };

  const sandProgress = (TOTAL_WAIT_SECONDS - secondsLeft) / TOTAL_WAIT_SECONDS;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 md:p-6 bg-gradient-to-b from-sky-100 via-amber-50 to-orange-100 overflow-hidden select-none">
      <div className="flex items-center justify-between z-20">
        <button
          onClick={() => {
            sound.playTap();
            haptics.tap();
            onBack();
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/90 hover:bg-white text-amber-950 font-black shadow-md border-2 border-amber-300 text-sm md:text-base touch-manipulation cursor-pointer"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة</span>
        </button>
        <div className="flex items-center gap-2">
          {!isFinished && (
            <button onClick={() => setIsPaused(value => !value)} className="flex items-center gap-1 px-3 py-2 bg-white/90 rounded-full border-2 border-sky-300 text-sky-800 font-black shadow text-sm">
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{isPaused ? 'استمرار' : 'توقف'}</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 px-4 py-2 bg-white/90 rounded-full border-2 border-sky-300 text-sky-800 font-bold shadow text-sm">
            <span>الفقاعات:</span>
            <span className="text-lg font-black text-sky-600">{poppedCount}</span>
          </div>
          <SpeechSpeakerButton textToSpeak={currentPrompt} size="md" />
        </div>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center my-2">
        <motion.div
          key={currentPrompt}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 border-3 border-amber-300 rounded-3xl p-4 md:p-5 shadow-lg text-center max-w-lg w-full mb-3 z-10 flex items-center gap-3"
        >
          <span className="text-3xl md:text-4xl shrink-0 filter drop-shadow">
            {isFinished ? '🌟' : '⏳'}
          </span>
          <p className="text-lg md:text-2xl font-black text-amber-950 leading-relaxed text-right flex-1">
            {currentPrompt}
          </p>
        </motion.div>

        {!isFinished && !isPaused && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {bubbles.map(bubble => (
              <motion.button
                key={bubble.id}
                initial={{ y: '100%', opacity: 0, scale: 0.6 }}
                animate={{ y: '-20%', opacity: 1, scale: 1 }}
                transition={{ duration: bubble.speed, ease: 'easeOut' }}
                onPointerDown={() => handlePopBubble(bubble.id)} // استخدام onPointerDown لسرعة الاستجابة
                style={{
                  left: `${bubble.x}%`,
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                  backgroundColor: `${bubble.color}33`,
                  borderColor: bubble.color,
                }}
                className="absolute pointer-events-auto rounded-full border-3 backdrop-blur-xs flex items-center justify-center text-2xl shadow-lg cursor-pointer transform active:scale-125 transition-transform"
              >
                <span>{bubble.symbol}</span>
              </motion.button>
            ))}
          </div>
        )}

        {!isFinished && isPaused && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-white/95 rounded-3xl border-4 border-sky-200 shadow-xl px-8 py-6 text-center">
              <div className="text-5xl mb-2">⏸️</div>
              <h2 className="text-2xl font-black text-sky-900">الانتظار متوقف</h2>
              <p className="text-sky-700 font-bold mt-1">اضغط استمرار لمواصلة التدريب</p>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center my-auto">
          {!isFinished ? (
            <div className="flex flex-col items-center">
              <div className="relative w-40 h-56 md:w-48 md:h-64">
                <svg viewBox="0 0 160 220" className="w-full h-full drop-shadow-xl">
                  <defs>
                    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#BAE6FD" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="woodFrame" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#92400E" />
                      <stop offset="50%" stopColor="#D97706" />
                      <stop offset="100%" stopColor="#92400E" />
                    </linearGradient>
                  </defs>
                  <rect x="20" y="10" width="120" height="16" rx="8" fill="url(#woodFrame)" />
                  <rect x="20" y="194" width="120" height="16" rx="8" fill="url(#woodFrame)" />
                  <rect x="25" y="26" width="10" height="168" rx="4" fill="url(#woodFrame)" />
                  <rect x="125" y="26" width="10" height="168" rx="4" fill="url(#woodFrame)" />
                  <path
                    d="M 38 26 C 38 75, 75 105, 75 110 C 75 115, 38 145, 38 194 L 122 194 C 122 145, 85 115, 85 110 C 85 105, 122 75, 122 26 Z"
                    fill="url(#glassGrad)"
                    stroke="#38BDF8"
                    strokeWidth="3"
                  />
                  <clipPath id="topSandClip">
                    <rect x="35" y={26 + sandProgress * 80} width="90" height={84 - sandProgress * 80} />
                  </clipPath>
                  <path
                    d="M 40 28 C 40 75, 75 105, 75 110 L 85 110 C 85 105, 120 75, 120 28 Z"
                    fill="#F59E0B"
                    clipPath="url(#topSandClip)"
                  />
                  <line x1="80" y1="108" x2="80" y2="175" stroke="#F59E0B" strokeWidth="4" strokeDasharray="6 3" className="animate-pulse" />
                  <path
                    d={`M ${80 - sandProgress * 38} 192 Q 80 ${192 - sandProgress * 45} ${80 + sandProgress * 38} 192 Z`}
                    fill="#F59E0B"
                  />
                </svg>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-amber-400 border-3 border-white text-amber-950 font-black px-4 py-1 rounded-full text-lg shadow">
                  {secondsLeft}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <LuluCharacter mood="idle" size="sm" />
                <p className="text-xs md:text-sm font-bold text-amber-800 bg-white/80 px-3 py-1.5 rounded-full border border-amber-300">
                  نحن ننتظر معاً بهدوء!
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.4, rotate: -20 }}
              animate={{ scale: [0.4, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center"
            >
              <div className="text-7xl md:text-8xl filter drop-shadow-2xl animate-bounce">
                🎉
              </div>
              <div className="mt-4 p-4 bg-emerald-500 border-4 border-emerald-300 rounded-3xl text-white text-center shadow-2xl max-w-sm">
                <span className="text-xl md:text-2xl font-black block">
                  {DIALOGUES.hourglass.timeUpSuccess.bannerText}
                </span>
                <span className="text-sm font-bold opacity-90 mt-1 block">
                  لقد كنت صبوراً جداً وبطلاً حقيقياً!
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="w-full max-w-md mx-auto z-20">
        {isFinished ? (
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-6 py-4 rounded-3xl bg-white text-emerald-800 font-black text-base shadow-lg border-2 border-emerald-200 hover:bg-emerald-50 active:scale-95 touch-manipulation cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>إعادة</span>
            </button>
            <button
              onClick={() => {
                haptics.tap();
                onBack();
              }}
              className="px-8 py-4 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg active:scale-95 touch-manipulation cursor-pointer"
            >
              ممتاز! عد للرئيسية
            </button>
          </div>
        ) : (
          <div className="p-3 bg-white/70 rounded-2xl text-center text-xs font-bold text-amber-900 border border-amber-200">
            اضغط على الفقاعات المتطايرة لتسليتك بينما يمر الوقت!
          </div>
        )}
      </div>
    </div>
  );
};
