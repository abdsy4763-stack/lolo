import React from 'react';
import { motion } from 'motion/react';
import { Lock, CheckCircle2, Sparkles, MapPin, Compass, Star } from 'lucide-react';
import { WorldMapEpisode, CompanionType } from '../types';
import { CompanionCharacter } from './CompanionCharacter';
import { sound } from '../utils/audio';
import { haptics } from '../utils/haptics';

export interface WorldMapProps {
  episodes: WorldMapEpisode[];
  companionType: CompanionType;
  onSelectEpisode: (episode: WorldMapEpisode) => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  episodes,
  companionType,
  onSelectEpisode,
}) => {
  const handleEpisodeClick = (episode: WorldMapEpisode) => {
    if (episode.isLocked) {
      sound.playBubblePop();
      haptics.error();
      return;
    }

    sound.playTap();
    haptics.tap();
    onSelectEpisode(episode);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center select-none pb-10">
      {/* رأس الخريطة بأسلوب خريطة الكنز والمغامرة */}
      <div className="w-full mb-6 bg-gradient-to-r from-amber-200 via-amber-100 to-orange-200 border-2 border-amber-300 rounded-3xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs">
            <Compass className="w-6 h-6 animate-[spin_10s_linear_infinite]" />
          </div>
          <div className="text-right">
            <h3 className="text-base sm:text-lg font-black text-amber-950 flex items-center gap-1.5">
              <span>خريطة طريق المغامرة</span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </h3>
            <p className="text-xs font-bold text-amber-800">
              اتبع المسار خطوة بخطوة واكتشف أسرار الشجاعة!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/90 px-3 py-1.5 rounded-full border border-amber-300 shadow-xs">
          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
          <span className="text-xs font-black text-amber-950">
            {episodes.filter((e) => e.isCompleted).length} / {episodes.length}
          </span>
        </div>
      </div>

      {/* مسار خريطة الكنز المتعرج (Zig-Zag) */}
      <div className="relative w-full px-2 sm:px-6 flex flex-col items-center">
        {episodes.map((episode, index) => {
          const isEven = index % 2 === 0;
          const isNextAvailable = index < episodes.length - 1;

          return (
            <div key={episode.id} className="relative w-full flex flex-col items-center">
              {/* صف العقدة المتعرج: يمين ثم يسار */}
              <div
                className={`w-full flex items-center my-3 transition-all duration-300 ${
                  isEven ? 'justify-start sm:pr-8' : 'justify-end sm:pl-8'
                }`}
              >
                <div
                  className={`relative flex items-center gap-3 ${
                    isEven ? 'flex-row' : 'flex-row-reverse text-left'
                  }`}
                >
                  {/* زر محطة المغامرة الرئيسي (دائرة/ميدالية بارزة) */}
                  <div className="relative">
                    <motion.button
                      whileHover={!episode.isLocked ? { scale: 1.08 } : {}}
                      whileTap={!episode.isLocked ? { scale: 0.92 } : {}}
                      onClick={() => handleEpisodeClick(episode)}
                      disabled={episode.isLocked}
                      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex flex-col items-center justify-center text-3xl sm:text-4xl shadow-xl border-4 transition-all duration-300 touch-manipulation cursor-pointer ${
                        episode.isCurrent
                          ? `bg-gradient-to-br ${episode.color} text-white border-white ring-4 ring-amber-400 ring-offset-2 ring-offset-amber-100 shadow-amber-400/50 scale-105`
                          : episode.isCompleted
                          ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white border-white shadow-emerald-400/40'
                          : 'bg-slate-200/90 text-slate-400 border-slate-300 opacity-60 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {/* محتوى المحطة */}
                      <span className="filter drop-shadow-md">{episode.emoji}</span>

                      {/* حالة القفل إذا كانت مقفلة */}
                      {episode.isLocked && (
                        <div className="absolute inset-0 bg-slate-900/40 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
                          <Lock className="w-7 h-7 text-white filter drop-shadow" />
                        </div>
                      )}

                      {/* شارة الإنجاز إذا كانت مكتملة */}
                      {episode.isCompleted && (
                        <div className="absolute -top-2 -right-2 bg-white text-emerald-600 rounded-full p-1 shadow-md border-2 border-emerald-400 animate-bounce">
                          <CheckCircle2 className="w-5 h-5 fill-emerald-100" />
                        </div>
                      )}

                      {/* رقم الحلقة */}
                      <span
                        className={`absolute -bottom-2.5 px-2 py-0.5 rounded-full text-[10px] font-black border shadow-xs ${
                          episode.isCurrent
                            ? 'bg-amber-950 text-white border-amber-300'
                            : episode.isCompleted
                            ? 'bg-emerald-900 text-emerald-100 border-emerald-300'
                            : 'bg-slate-600 text-slate-200 border-slate-400'
                        }`}
                      >
                        {episode.number}
                      </span>
                    </motion.button>

                    {/* شخصية الرفيق تجلس فوق المحطة الحالية المفتوحة مع حركة طفو خفيفة */}
                    {episode.isCurrent && (
                      <motion.div
                        animate={{ y: [-4, -14, -4], rotate: [-2, 2, -2] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-2xl flex flex-col items-center"
                      >
                        <CompanionCharacter type={companionType} mood="idle" size="sm" />
                        <div className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full border border-white shadow-xs mx-auto -mt-2 w-max animate-pulse">
                          أنت هنا! 🚩
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* بطاقة معلومات المحطة المرافقة */}
                  <motion.div
                    whileHover={!episode.isLocked ? { scale: 1.02 } : {}}
                    onClick={() => handleEpisodeClick(episode)}
                    className={`max-w-[170px] sm:max-w-[210px] p-3 rounded-2xl border-2 shadow-sm transition-all duration-300 cursor-pointer ${
                      episode.isCurrent
                        ? 'bg-white/95 border-amber-400 text-amber-950 shadow-md ring-2 ring-amber-200'
                        : episode.isCompleted
                        ? 'bg-white/90 border-emerald-300 text-slate-800'
                        : 'bg-white/50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md">
                        محطة {episode.number}
                      </span>
                      {episode.isCurrent && (
                        <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md animate-pulse">
                          جاهزة للبدء!
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-black truncate leading-tight">
                      {episode.title}
                    </h4>
                    <p className="text-[11px] font-bold opacity-80 mt-1 line-clamp-2 leading-relaxed">
                      {episode.subtitle}
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* خط واصل متعرج إلى المحطة التالية (مثل خريطة الكنز) */}
              {isNextAvailable && (
                <div className="w-full h-14 sm:h-16 relative flex items-center justify-center my-0 pointer-events-none">
                  <svg
                    className="w-full h-full max-w-xs sm:max-w-sm overflow-visible"
                    viewBox="0 0 240 60"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop
                          offset="0%"
                          stopColor={episode.isCompleted ? '#10B981' : '#D97706'}
                        />
                        <stop
                          offset="100%"
                          stopColor={
                            episodes[index + 1].isCompleted
                              ? '#10B981'
                              : episodes[index + 1].isCurrent
                              ? '#F59E0B'
                              : '#CBD5E1'
                          }
                        />
                      </linearGradient>
                    </defs>

                    {/* مسار S-Curve متعرج يربط نقطة اليمين بنقطة اليسار أو العكس */}
                    <path
                      d={
                        isEven
                          ? 'M 50 2 C 50 35, 190 25, 190 58'
                          : 'M 190 2 C 190 35, 50 25, 50 58'
                      }
                      fill="none"
                      stroke={`url(#grad-${index})`}
                      strokeWidth="5"
                      strokeDasharray="7 7"
                      strokeLinecap="round"
                    />

                    {/* آثار خطوات / نجوم صغيرة على المسار */}
                    <circle
                      cx={isEven ? 120 : 120}
                      cy={30}
                      r="4"
                      fill={episode.isCompleted ? '#10B981' : '#F59E0B'}
                      opacity="0.8"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
