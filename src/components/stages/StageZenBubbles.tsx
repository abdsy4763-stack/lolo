import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { ArrowRight, RotateCcw, Star, Pause, Play } from 'lucide-react';
import { sound } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { Storage } from '../../utils/storage';
import { COMPANIONS_DATA } from '../CompanionCharacter';

interface Bubble {
  id: number;
  x: number; 
  size: number;
  speed: number;
  hasStar: boolean;
}

interface StageZenBubblesProps {
  onBack: () => void;
  onEarnStar?: (sticker: string, note: string) => void;
}

export const StageZenBubbles: React.FC<StageZenBubblesProps> = ({ onBack, onEarnStar }) => {
  const companion = Storage.getCompanionProfile();
  const companionDef = COMPANIONS_DATA[companion.type];

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45); // 45 ثانية من الهدوء
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const bubbleIdRef = useRef(1);
  const scoreRef = useRef(0);

  useEffect(() => {
    sound.speak(`وقت الاسترخاء يا ${companion.name}. المس الفقاعات بهدوء واجمع النجوم بلطف.`);
    setIsPlaying(true);
  }, [companion.name]);

  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, isPaused]);

  useEffect(() => {
    if (!isPlaying || isPaused) return;
    const spawner = setInterval(() => {
      setBubbles(prev => {
        if (prev.length > 8) return prev;
        const newBubble: Bubble = {
          id: bubbleIdRef.current++,
          x: 10 + Math.random() * 80,
          size: 60 + Math.random() * 40,
          speed: 8 + Math.random() * 6, // حركة بطيئة جداً ومريحة
          hasStar: Math.random() > 0.4, // 60% نسبة وجود نجمة
        };
        return [...prev, newBubble];
      });
    }, 1200);
    return () => clearInterval(spawner);
  }, [isPlaying, isPaused]);

  const handlePop = (id: number, hasStar: boolean) => {
    sound.playBubblePop();
    haptics.pop();
    setBubbles(prev => prev.filter(b => b.id !== id));
    if (hasStar) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
  };

  const endGame = () => {
    setIsPlaying(false);
    sound.playSuccessChime();
    haptics.success();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    
    const finalScore = scoreRef.current;
    if (finalScore > 0) {
      const currentCoins = companion.coins || 0;
      Storage.saveCompanionProfile({ coins: currentCoins + finalScore });
    }
    sound.speak(`أنت هادئ ورائع! لقد جمعت ${finalScore} عملة ذهبية.`);
    Storage.addLog({ type: 'game_played', stageId: 'zen_bubbles', label: 'لعب فقاعات الهدوء', detail: `حصد ${finalScore} نقطة` });
    if (onEarnStar) {
      setTimeout(() => {
        onEarnStar('🫧', 'الهدوء الداخلي وتفريغ التوتر');
      }, 1500);
    }
  };

  const restart = () => {
    sound.playTap();
    haptics.tap();
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(45);
    setBubbles([]);
    setIsPaused(false);
    setIsPlaying(true);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col p-4 md:p-6 bg-gradient-to-b from-sky-200 via-blue-100 to-indigo-100 overflow-hidden select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between z-20">
        <button onClick={() => { sound.playTap(); haptics.tap(); onBack(); }} className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/50 hover:bg-white text-sky-900 font-black shadow-sm border-2 border-white backdrop-blur-sm">
          <ArrowRight className="w-5 h-5" /> <span>العودة</span>
        </button>
        <div className="flex gap-2 items-center">
          {isPlaying && (
            <button onClick={() => setIsPaused(value => !value)} className="flex items-center gap-1 px-3 py-2 bg-white/60 rounded-full border-2 border-white text-sky-900 font-black shadow-sm">
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{isPaused ? 'استمرار' : 'توقف'}</span>
            </button>
          )}
          <div className="flex items-center gap-1 px-4 py-2 bg-white/50 rounded-full border-2 border-white text-amber-500 font-black shadow-sm backdrop-blur-sm">
            <Star className="w-5 h-5 fill-amber-400" /> {score}
          </div>
          <div className="px-4 py-2 bg-white/50 rounded-full border-2 border-white text-sky-900 font-black shadow-sm backdrop-blur-sm">
            {timeLeft} ث
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative mt-4">
        {isPlaying && !isPaused && (
          <AnimatePresence>
            {bubbles.map(bubble => (
              <motion.button
                key={bubble.id}
                initial={{ top: '100%', opacity: 0, scale: 0.5 }}
                animate={{ top: '-20%', opacity: 1, scale: 1 }}
                exit={{ scale: 1.5, opacity: 0 }} // انفجار ناعم
                transition={{ duration: bubble.speed, ease: 'linear' }}
                onPointerDown={() => handlePop(bubble.id, bubble.hasStar)}
                style={{ left: `${bubble.x}%`, position: 'absolute' }}
                className="cursor-pointer touch-manipulation z-10 flex items-center justify-center"
              >
                <div 
                  className="rounded-full bg-white/30 backdrop-blur-sm border border-white/60 shadow-[inset_0_0_20px_rgba(255,255,255,0.8)] flex items-center justify-center"
                  style={{ width: bubble.size, height: bubble.size }}
                >
                  <div className="absolute top-[15%] left-[20%] w-[20%] h-[20%] bg-white/60 rounded-full blur-[2px]" />
                  {bubble.hasStar && <Star className="text-amber-400 fill-amber-300 w-1/2 h-1/2 opacity-90" />}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        )}

        {isPlaying && isPaused && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="bg-white/90 rounded-3xl border-4 border-sky-200 shadow-xl px-8 py-6 text-center">
              <div className="text-5xl mb-2">⏸️</div>
              <h2 className="text-2xl font-black text-sky-900">اللعبة متوقفة</h2>
              <p className="text-sky-700 font-bold mt-1">اضغط استمرار عندما تكون مستعداً</p>
            </div>
          </div>
        )}

        {!isPlaying && timeLeft === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white/90 backdrop-blur-md border-4 border-white rounded-3xl p-8 text-center max-w-sm shadow-xl">
              <div className="text-6xl mb-4">😌</div>
              <h2 className="text-3xl font-black text-sky-900 mb-2">هدوء وسلام</h2>
              <p className="text-sky-700 font-bold mb-6">لقد جمعت {score} نجمة بهدوء تام.</p>
              <div className="flex gap-3">
                <button onClick={restart} className="flex-1 py-3 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-2xl font-black flex items-center justify-center gap-2">
                  <RotateCcw className="w-5 h-5" /> إعادة
                </button>
                <button onClick={onBack} className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black shadow-md">
                  للعودة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
