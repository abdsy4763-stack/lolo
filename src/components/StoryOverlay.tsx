import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { ArrowLeft, ArrowRight, Play, Volume2, Sparkles, Star, Award, X, ChevronLeft, MapPin } from 'lucide-react';
import { StoryEpisode, DialogueLine, BiomeType } from '../types';
import { CompanionCharacter, COMPANIONS_DATA } from './CompanionCharacter';
import { MotherCharacter } from './MotherCharacter';
import { SpeechSpeakerButton } from './SpeechSpeakerButton';
import { Storage } from '../utils/storage';
import { sound, audioManager } from '../utils/audio';
import { formatDialogue } from '../data/dialogue';

interface StoryOverlayProps {
  episode: StoryEpisode;
  mode: 'intro' | 'victory';
  onStartChallenge: () => void;
  onFinishEpisode: () => void;
  onClose: () => void;
}

const BIOME_BACKGROUNDS: Record<BiomeType, {
  gradient: string;
  decorations: string[];
  ambientColor: string;
}> = {
  meadow: {
    gradient: 'from-amber-200 via-emerald-100 to-sky-200',
    decorations: ['🌸', '🌼', '🦋', '🌿'],
    ambientColor: 'rgba(16, 185, 129, 0.15)',
  },
  river: {
    gradient: 'from-sky-300 via-blue-100 to-teal-200',
    decorations: ['🌊', '🐟', '🫧', '🪷'],
    ambientColor: 'rgba(14, 165, 233, 0.15)',
  },
  rain_valley: {
    gradient: 'from-slate-300 via-blue-200 to-teal-100',
    decorations: ['🌧️', '💧', '☁️', '☔'],
    ambientColor: 'rgba(71, 85, 105, 0.15)',
  },
  desert: {
    gradient: 'from-amber-300 via-orange-200 to-yellow-100',
    decorations: ['☀️', '🌴', '🏜️', '✨'],
    ambientColor: 'rgba(245, 158, 11, 0.15)',
  },
  crystal_mountain: {
    gradient: 'from-indigo-300 via-purple-200 to-pink-100',
    decorations: ['💎', '✨', '🔮', '🌟'],
    ambientColor: 'rgba(139, 92, 246, 0.15)',
  },
  forest: {
    gradient: 'from-emerald-300 via-teal-200 to-lime-100',
    decorations: ['🍃', '🌲', '🎈', '🐿️'],
    ambientColor: 'rgba(5, 150, 105, 0.15)',
  },
  calm_garden: {
    gradient: 'from-pink-200 via-rose-100 to-amber-100',
    decorations: ['💖', '🌺', '🕊️', '🌸'],
    ambientColor: 'rgba(244, 63, 94, 0.15)',
  },
  royal_castle: {
    gradient: 'from-amber-300 via-purple-200 to-indigo-200',
    decorations: ['👑', '🏰', '✨', '⚜️'],
    ambientColor: 'rgba(217, 119, 6, 0.2)',
  },
};

export const StoryOverlay: React.FC<StoryOverlayProps> = ({
  episode,
  mode,
  onStartChallenge,
  onFinishEpisode,
  onClose,
}) => {
  const companion = Storage.getCompanionProfile();
  const companionDef = COMPANIONS_DATA[companion.type] || COMPANIONS_DATA.lion;
  const settings = Storage.getSettings();

  const lines = mode === 'intro' ? episode.introStory : episode.victoryStory;
  const [currentLineIdx, setCurrentLineIdx] = useState(0);

  const currentLine = lines[currentLineIdx] || lines[0];
  const isLastLine = currentLineIdx >= lines.length - 1;

  const biomeConfig = BIOME_BACKGROUNDS[episode.biome] || BIOME_BACKGROUNDS.meadow;

  // تنسيق النص بالاسم الحقيقي للطفل والرفيق
  const formattedText = formatDialogue(
    currentLine.text,
    companion.name,
    companionDef.title,
    settings.childGender
  );

  const speakerDisplayName = formatDialogue(
    currentLine.speakerName,
    companion.name,
    companionDef.title,
    settings.childGender
  );

  // نطق السطر الجديد عند التغيير
  useEffect(() => {
    if (currentLine.soundFx === 'success_chime') sound.playSuccessChime();
    else if (currentLine.soundFx === 'tada') sound.playTada();
    else if (currentLine.soundFx === 'warm_hug') sound.playWarmHug();
    else if (currentLine.soundFx === 'bubble_pop') sound.playBubblePop();
    else sound.playTap();

    sound.speak(formattedText, undefined, currentLine.voiceClipKey);
  }, [currentLineIdx, mode]);

  // إطلاق كونفيتي عند بدء وضع النصر
  useEffect(() => {
    if (mode === 'victory') {
      confetti({
        particleCount: 65,
        spread: 80,
        origin: { y: 0.5 },
      });
    }
  }, [mode]);

  const handleNextLine = () => {
    sound.playTap();
    if (!isLastLine) {
      setCurrentLineIdx(prev => prev + 1);
    } else {
      if (mode === 'intro') {
        onStartChallenge();
      } else {
        onFinishEpisode();
      }
    }
  };

  const handleSkip = () => {
    sound.playTap();
    if (mode === 'intro') {
      onStartChallenge();
    } else {
      onFinishEpisode();
    }
  };

  const isCompanionSpeaking = currentLine.speakerType === 'companion';
  const isMomSpeaking = currentLine.speakerType === 'mom';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col justify-between p-4 md:p-6 bg-gradient-to-b ${biomeConfig.gradient} overflow-hidden select-none`}>
      {/* خلفية تفاعلية للبيئة (عناصر متحركة لطيفة) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {biomeConfig.decorations.map((deco, idx) => (
          <motion.div
            key={idx}
            animate={{
              y: [0, -18, 0],
              x: [0, idx % 2 === 0 ? 12 : -12, 0],
              rotate: [0, idx % 2 === 0 ? 10 : -10, 0],
            }}
            transition={{
              duration: 3 + idx,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: idx * 0.4,
            }}
            style={{
              position: 'absolute',
              top: `${15 + idx * 18}%`,
              left: `${10 + idx * 24}%`,
            }}
            className="text-3xl md:text-5xl opacity-40 filter drop-shadow"
          >
            {deco}
          </motion.div>
        ))}
      </div>

      {/* الشريط العلوي للرواية */}
      <div className="relative z-10 flex items-center justify-between max-w-2xl mx-auto w-full">
        {/* زر العودة للخريطة */}
        <button
          onClick={() => {
            sound.playTap();
            sound.stopSpeech();
            onClose();
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/90 hover:bg-white text-slate-800 font-bold shadow-md border-2 border-white text-xs md:text-sm cursor-pointer touch-manipulation transition"
        >
          <X className="w-4 h-4" />
          <span>خريطة العالم</span>
        </button>

        {/* شارة عنوان الحلقة والبيئة */}
        <div className="flex items-center gap-2 bg-white/95 px-4 py-2 rounded-2xl border-2 border-white shadow-md">
          <span className="text-xl md:text-2xl">{episode.icon}</span>
          <div className="text-right">
            <span className="text-[10px] font-black text-indigo-600 block leading-tight">
              الحلقة {episode.number}: {episode.biomeName}
            </span>
            <span className="text-xs md:text-sm font-black text-slate-800">
              {episode.title}
            </span>
          </div>
        </div>

        {/* زر التخطي السريع */}
        <button
          onClick={handleSkip}
          className="px-3.5 py-2 rounded-full bg-black/10 hover:bg-black/20 text-slate-700 font-bold text-xs cursor-pointer touch-manipulation transition"
        >
          تخطي
        </button>
      </div>

      {/* مسرح الشخصيات المرئية (Character Stage) */}
      <div className="relative z-10 flex-1 flex items-end justify-around max-w-2xl mx-auto w-full px-2 my-2 min-h-[220px]">
        {/* شخصية الطرف الآخر (ماما، البومة، الصديق) - تنزلق من اليسار */}
        <AnimatePresence mode="wait">
          {!isCompanionSpeaking && (
            <motion.div
              key={currentLine.speakerType}
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1, scale: 1.05 }}
              exit={{ x: -80, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              className="flex flex-col items-center drop-shadow-xl"
            >
              {isMomSpeaking ? (
                <MotherCharacter mood={mode === 'victory' ? 'smiling' : 'denying'} size="md" />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/90 border-4 border-amber-300 shadow-xl flex items-center justify-center text-6xl md:text-7xl">
                  {currentLine.speakerEmoji || '🦉'}
                </div>
              )}
              <span className="text-xs font-black text-slate-800 bg-white/90 px-3 py-1 rounded-full border border-slate-200 mt-2 shadow-xs">
                {speakerDisplayName}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* شخصية الرفيق البطل - تنزلق من اليمين وترتدي الإكسسوار */}
        <motion.div
          animate={
            isCompanionSpeaking
              ? { scale: [1, 1.05, 1], y: [0, -6, 0] }
              : { scale: 0.95, opacity: 0.85 }
          }
          transition={{ duration: 1.5, repeat: isCompanionSpeaking ? Infinity : 0 }}
          className="flex flex-col items-center drop-shadow-xl"
        >
          <CompanionCharacter
            type={companion.type}
            mood={
              mode === 'victory'
                ? 'happy'
                : currentLine.speakerMood || 'talking'
            }
            size="md"
            accessory={companion.equippedAccessory}
          />
          <span className="text-xs font-black text-slate-800 bg-white/90 px-3 py-1 rounded-full border border-slate-200 mt-2 shadow-xs">
            {companion.name}
          </span>
        </motion.div>
      </div>

      {/* صندوق حوار الرواية المرئية السفلي (Visual Novel Dialog Box) */}
      <div className="relative z-20 max-w-2xl mx-auto w-full pb-2">
        <motion.div
          key={currentLine.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/95 backdrop-blur-md rounded-3xl p-4 md:p-5 shadow-2xl border-4 border-white text-right space-y-3"
        >
          {/* اسم المتحدث وشارة النطق */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
              <h4 className="text-base md:text-lg font-black text-indigo-900">
                {speakerDisplayName}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">
                {currentLineIdx + 1} / {lines.length}
              </span>
              <SpeechSpeakerButton textToSpeak={formattedText} size="sm" />
            </div>
          </div>

          {/* نص الحوار بخط كبير وواضح جداً */}
          <p className="text-base md:text-xl font-bold text-slate-800 leading-relaxed min-h-[60px]">
            «{formattedText}»
          </p>

          {/* شريط الإجراءات السفلي */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {/* في حال الوصول لآخر سطر في المقدمة: دعوة للعب الميني جيم */}
            {isLastLine && mode === 'intro' ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onStartChallenge}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-base md:text-lg shadow-xl flex items-center justify-center gap-2 cursor-pointer touch-manipulation border-2 border-white animate-pulse"
              >
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>هيا نبدأ التحدي ونساعد {companion.name}! 🎮</span>
              </motion.button>
            ) : isLastLine && mode === 'victory' ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onFinishEpisode}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-base md:text-lg shadow-xl flex items-center justify-center gap-2 cursor-pointer touch-manipulation border-2 border-white"
              >
                <Award className="w-6 h-6 text-yellow-200 animate-spin" />
                <span>استلم المكافأة وافتح المحطة التالية! 🗺️</span>
              </motion.button>
            ) : (
              <>
                <button
                  onClick={() => sound.speak(formattedText, undefined, currentLine.voiceClipKey)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer touch-manipulation"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>إعادة النطق</span>
                </button>

                <button
                  onClick={handleNextLine}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm md:text-base flex items-center gap-2 shadow-md cursor-pointer touch-manipulation transition transform active:scale-95"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
