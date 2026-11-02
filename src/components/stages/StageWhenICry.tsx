import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw, Heart, Sparkles, MessageCircle } from 'lucide-react';
import { LuluCharacter, LuluMood } from '../LuluCharacter';
import { SpeechSpeakerButton } from '../SpeechSpeakerButton';
import { DIALOGUES, formatDialogue } from '../../data/dialogue';
import { sound } from '../../utils/audio';
import { Storage } from '../../utils/storage';
import { COMPANIONS_DATA } from '../CompanionCharacter';

interface StageWhenICryProps {
  onBack: () => void;
  onEarnStar: (sticker: string, note: string) => void;
}

const FEELINGS_LIST = [
  { label: 'حزين', emoji: '😢', color: 'bg-sky-500 hover:bg-sky-600 border-sky-300' },
  { label: 'غاضب', emoji: '😡', color: 'bg-rose-500 hover:bg-rose-600 border-rose-300' },
  { label: 'خائف', emoji: '😨', color: 'bg-purple-500 hover:bg-purple-600 border-purple-300' },
];

export const StageWhenICry: React.FC<StageWhenICryProps> = ({
  onBack,
  onEarnStar,
}) => {
  const companion = Storage.getCompanionProfile();
  const companionDef = COMPANIONS_DATA[companion.type];

  const [luluMood, setLuluMood] = useState<LuluMood>('crying');
  const [selectedFeeling, setSelectedFeeling] = useState<string>('حزين');
  const [hasHugged, setHasHugged] = useState(false);
  const [speakerIcon, setSpeakerIcon] = useState<string>('🥺');
  const [currentPrompt, setCurrentPrompt] = useState<string>(
    formatDialogue(`${DIALOGUES.whenICry.intro} .. ${DIALOGUES.whenICry.question}`, companion.name, companionDef.title)
  );

  useEffect(() => {
    const text = formatDialogue(`${DIALOGUES.whenICry.intro} .. ${DIALOGUES.whenICry.question}`, companion.name, companionDef.title);
    sound.speak(text);
  }, []);

  const handleSelectFeeling = (feeling: string, emoji: string) => {
    sound.playTap();
    setSelectedFeeling(feeling);
    setSpeakerIcon(emoji);
    const text = `${companion.name} يشعر أنه ${feeling} الآن..`;
    setCurrentPrompt(text);
    sound.speak(text);
  };

  const handleAskForHug = () => {
    sound.playTap();
    setHasHugged(true);
    setLuluMood('hugging');
    setSpeakerIcon('🤗');

    // الرفيق يحتضن ويقول: "البكاء يخرج الزعل، وبعده نجرّب سحرنا"
    const hugResponse = formatDialogue(DIALOGUES.whenICry.luluHugResponse, companion.name, companionDef.title);
    setCurrentPrompt(hugResponse);

    sound.playWarmHug();
    sound.speak(hugResponse, () => {
      sound.playTada();
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.55 },
      });
      onEarnStar('💖', 'بطل التعبير والمحبة');
    });

    Storage.addLog({
      type: 'hug_received',
      stageId: 'when_i_cry',
      label: 'طلب حضناً وعبر بالكلمات',
      detail: `الشعور: ${selectedFeeling}`,
    });
  };

  const handleRestart = () => {
    sound.playTap();
    setHasHugged(false);
    setLuluMood('crying');
    setSelectedFeeling('حزين');
    setSpeakerIcon('🥺');
    const introText = `${DIALOGUES.whenICry.intro} .. ${DIALOGUES.whenICry.question}`;
    setCurrentPrompt(introText);
    sound.speak(introText);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 md:p-6 bg-gradient-to-b from-rose-100 via-amber-50 to-pink-100 overflow-x-hidden select-none">
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

      {/* المشهد التفاعلي: لؤلؤ الباكي أو المحتضن */}
      <div className="flex-1 flex flex-col items-center justify-center my-2 relative">
        {/* فقاعة الحديث الحالية بنص كبير وأيقونة مرافقة واضحة */}
        <motion.div
          key={currentPrompt}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 border-3 border-rose-300 rounded-3xl p-4 md:p-5 shadow-lg text-center max-w-lg w-full mb-3 flex items-center gap-3"
        >
          <span className="text-3xl md:text-4xl shrink-0 filter drop-shadow">
            {speakerIcon}
          </span>
          <p className="text-xl md:text-3xl font-black text-amber-950 leading-relaxed text-right flex-1">
            {currentPrompt}
          </p>
        </motion.div>

        {/* شخصية لؤلؤ بالدموع أو العناق */}
        <div className="flex flex-col items-center my-2 relative">
          {hasHugged && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="absolute -top-7 text-5xl filter drop-shadow-md z-20"
            >
              💖
            </motion.div>
          )}

          <LuluCharacter
            mood={luluMood}
            size="hero"
          />

          {!hasHugged ? (
            <div className="mt-3 flex items-center gap-2 bg-white/90 px-4 py-1.5 rounded-full border border-amber-300 text-xs md:text-sm font-black text-amber-900 shadow-xs">
              <span>اختر وجه الشعور المناسب لـ {companion.name}:</span>
              <span className="text-rose-600 underline text-base font-black">{selectedFeeling}</span>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-1.5 bg-emerald-100 text-emerald-900 px-4 py-1.5 rounded-full border border-emerald-300 text-sm font-black shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>أنت بطل رائع ومشاعرك مقدرة دائماً!</span>
            </div>
          )}
        </div>

        {/* وجوه المشاعر الثلاثة: حزين، غاضب، خائف */}
        {!hasHugged && (
          <div className="flex items-center justify-center gap-3 max-w-md w-full my-2">
            {FEELINGS_LIST.map(item => (
              <button
                key={item.label}
                onClick={() => handleSelectFeeling(item.label, item.emoji)}
                className={`flex-1 h-24 md:h-28 rounded-3xl border-3 flex flex-col items-center justify-center gap-1.5 shadow-md transition transform active:scale-95 touch-manipulation cursor-pointer ${
                  selectedFeeling === item.label
                    ? `${item.color} text-white scale-105 shadow-xl ring-4 ring-rose-200`
                    : 'bg-white/95 text-slate-800 border-amber-200 hover:bg-rose-50'
                }`}
              >
                <span className="text-3xl md:text-4xl filter drop-shadow-sm">{item.emoji}</span>
                <span className="text-sm md:text-base font-black">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* زر الحضن الضخم: "أنا زعلان، أريد حضناً" (لا يقل عن 120px) */}
      <div className="w-full max-w-md mx-auto z-10">
        <AnimatePresence mode="wait">
          {!hasHugged ? (
            <motion.button
              key="hug-btn"
              initial={{ scale: 0.95 }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              onClick={handleAskForHug}
              className="w-full h-32 md:h-36 rounded-3xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 hover:from-rose-600 hover:to-pink-600 text-white p-4 flex items-center justify-center gap-4 shadow-2xl border-4 border-rose-300 touch-manipulation cursor-pointer active:scale-95 transition"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-4xl shadow-inner shrink-0">
                🤗
              </div>
              <div className="text-right">
                <span className="text-2xl md:text-3xl font-black block leading-snug">
                  {DIALOGUES.whenICry.buttonHug}
                </span>
                <span className="text-xs md:text-sm font-bold opacity-90 block mt-1">
                  المس لتحصل على حضن لؤلؤ وتزيل الزعل
                </span>
              </div>
            </motion.button>
          ) : (
            <motion.div
              key="hug-completed"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex gap-3 justify-center"
            >
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-6 py-4 rounded-3xl bg-white text-rose-800 font-black text-base shadow-lg border-2 border-rose-200 hover:bg-rose-50 active:scale-95 touch-manipulation cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>حضن آخر</span>
              </button>
              <button
                onClick={onBack}
                className="px-8 py-4 rounded-3xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base shadow-lg active:scale-95 touch-manipulation cursor-pointer"
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
