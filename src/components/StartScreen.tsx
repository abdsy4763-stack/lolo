import React, { useState } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { LuluCharacter } from './LuluCharacter';
import { audioManager } from '../utils/audio';

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [isStarting, setIsStarting] = useState(false);

  const handleStartClick = async () => {
    if (isStarting) return;
    setIsStarting(true);

    // فك قفل AudioContext وspeechSynthesis بلمسة المستخدم الإلزامية
    await audioManager.unlockAudio();

    // تشغيل نغمة نجاح خفيفة
    audioManager.playSuccessChime();

    // الانتقال للعبة
    setTimeout(() => {
      onStart();
    }, 350);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-6 bg-gradient-to-b from-amber-100 via-amber-50 to-emerald-100 overflow-hidden select-none text-center">
      {/* هالات خلفية دافئة */}
      <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
        <div className="absolute -top-12 -left-12 w-80 h-80 rounded-full bg-emerald-400 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-12 w-96 h-96 rounded-full bg-amber-400 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-lime-300 blur-3xl" />
      </div>

      {/* العنوان اللطيف */}
      <div className="relative z-10 pt-4 flex flex-col items-center">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-200/80 border border-amber-300 text-amber-900 text-xs md:text-sm font-bold shadow-xs mb-3">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>لعبة تعليمية ممتعة للأبطال الصغار</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-amber-950 tracking-tight">
          مغامرات لؤلؤ الشجاع
        </h1>
        <p className="text-sm md:text-base font-bold text-amber-800 mt-1">
          تعلم التعبير عن المشاعر والإقناع اللطيف مع لؤلؤ
        </p>
      </div>

      {/* شخصية لؤلؤ في الوسط */}
      <div className="relative z-10 my-auto flex flex-col items-center">
        <LuluCharacter mood={isStarting ? 'happy' : 'idle'} size="hero" />
        <p className="text-xs md:text-sm font-bold text-amber-900 bg-white/80 border border-amber-200 px-4 py-1 rounded-full shadow-xs mt-2">
          لؤلؤ ينتظر اللعب معك! 🦁✨
        </p>
      </div>

      {/* زر البدء الضخم (أيقونة تشغيل ▶ مع تفعيل الصوت) */}
      <div className="relative z-10 pb-6 w-full max-w-sm flex flex-col items-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            scale: [1, 1.04, 1],
            boxShadow: [
              '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
              '0 20px 35px -5px rgba(245, 158, 11, 0.7)',
              '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
            ],
          }}
          transition={{ duration: 1.8, repeat: Infinity }}
          onClick={handleStartClick}
          className="w-full h-24 md:h-28 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:to-orange-600 text-white p-4 flex items-center justify-center gap-4 shadow-2xl border-4 border-amber-200 touch-manipulation cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl shadow-inner shrink-0">
            <Play className="w-8 h-8 fill-white translate-x-0.5" />
          </div>
          <div className="text-right">
            <span className="text-2xl md:text-3xl font-black block leading-none">
              ابدأ اللعب!
            </span>
            <span className="text-xs md:text-sm font-bold opacity-90 block mt-1">
              المس هنا لتشغيل الصوت والمغامرة
            </span>
          </div>
        </motion.button>

        <span className="text-[11px] text-amber-800/70 mt-3 font-bold">
          🔊 بنقرك هنا يتم تفعيل الصوتيات والنطق العربي
        </span>
      </div>
    </div>
  );
};
