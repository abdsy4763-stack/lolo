import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Clock, Sparkles, Smile, ArrowRight, RotateCcw, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { LuluCharacter, LuluMood } from '../LuluCharacter';
import { MotherCharacter } from '../MotherCharacter';
import { SpeechSpeakerButton } from '../SpeechSpeakerButton';
import { DIALOGUES, formatDialogue } from '../../data/dialogue';
import { sound } from '../../utils/audio';
import { Storage } from '../../utils/storage';
import { COMPANIONS_DATA } from '../CompanionCharacter';
import { CustomEducationalScenario } from '../../types';

interface StageMagicWordsProps {
  onBack: () => void;
  onEarnStar: (sticker: string, note: string) => void;
}

export const StageMagicWords: React.FC<StageMagicWordsProps> = ({
  onBack,
  onEarnStar,
}) => {
  const companion = Storage.getCompanionProfile();
  const companionDef = COMPANIONS_DATA[companion.type] || COMPANIONS_DATA.lion;
  const settings = Storage.getSettings();

  // جمع كافة المواقف التربوية (الافتراضية المفعّلة + المخصصة من الأهل)
  const defaultRounds = DIALOGUES.magicWords.rounds;
  const customScenarios = Storage.getCustomScenarios().filter(s => s.enabled);
  
  // دمج وتصفية المواقف حسب إعدادات الوالدين
  const allAvailableRounds = [
    ...defaultRounds.filter(r => settings.enabledScenarioIds.includes(r.id)),
    ...customScenarios.map(c => ({
      id: c.id,
      title: c.title,
      icon: c.icon || '🌟',
      targetLabel: c.targetLabel || c.title,
      companionRequest: c.companionRequest,
      momInitial: c.momInitial,
      compromiseProposal: c.compromiseProposal,
      fullRewardPraise: c.fullRewardPraise,
      compromiseAcceptedVoice: 'اتفقنا يا ماما! قبلت الحل الوسط!',
      fullAcceptedVoice: 'مرحى! اكتمل قوس الأمل وفزنا بالهدية!',
    }))
  ];

  // في حال لم يكن هناك أي موقف مفعّل، نستخدم الافتراضيات
  const activeRoundsList = allAvailableRounds.length > 0 ? allAvailableRounds : defaultRounds;

  const [roundIndex, setRoundIndex] = useState(0);
  const currentRound = activeRoundsList[roundIndex] || activeRoundsList[0];

  const [rainbowLevel, setRainbowLevel] = useState(1);
  const [luluMood, setLuluMood] = useState<LuluMood>('idle');
  const [motherMood, setMotherMood] = useState<'denying' | 'smiling' | 'givingCookie'>('denying');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [showCards, setShowCards] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCryingState, setIsCryingState] = useState(false);
  const [compromiseOffered, setCompromiseOffered] = useState(false);

  const rainbowColors = [
    'bg-rose-500',
    'bg-amber-400',
    'bg-emerald-400',
    'bg-sky-400',
    'bg-purple-500'
  ];

  // تشغيل الموقف عند التبديل
  useEffect(() => {
    resetScenarioState();
  }, [roundIndex]);

  const resetScenarioState = () => {
    setRainbowLevel(1);
    setLuluMood('idle');
    setMotherMood('denying');
    setIsSuccess(false);
    setIsCryingState(false);
    setCompromiseOffered(false);
    setShowCards(true);

    const initialText = formatDialogue(
      `${currentRound.companionRequest} .. ${currentRound.momInitial}`,
      companion.name,
      companionDef.title,
      settings.childGender
    );
    setCurrentPrompt(initialText);

    const spokenIntro = formatDialogue(
      `${currentRound.companionRequest} .. ${currentRound.momInitial} .. استخدم الكلمات السحرية لإقناعها!`,
      companion.name,
      companionDef.title,
      settings.childGender
    );
    sound.speak(spokenIntro, undefined, 'mom_denial');
  };

  const handleCardClick = (cardType: 'please' | 'promiseAfterDinner' | 'helpFirst' | 'cryingOption') => {
    sound.playTap();

    if (cardType === 'cryingOption') {
      Storage.addLog({
        type: 'crying_chosen',
        stageId: 'magic_words',
        label: 'التعبير عن البكاء',
        detail: currentRound.title,
      });

      setLuluMood('crying');
      setIsCryingState(true);
      setShowCards(false);
      const cryingText = formatDialogue(
        DIALOGUES.magicWords.cryingReaction.luluVoice,
        companion.name,
        companionDef.title,
        settings.childGender
      );
      setCurrentPrompt(cryingText);
      sound.playWarmHug();

      setTimeout(() => {
        setLuluMood('comforting');
        sound.speak(cryingText, () => {
          setTimeout(() => {
            setLuluMood('idle');
            setIsCryingState(false);
            setShowCards(true);
            setCurrentPrompt("هيا يا بطل، جرب سحر كلامك اللطيف لملء قوس الأمل!");
          }, 1400);
        }, 'warm_hug');
      }, 600);
      return;
    }

    // بطاقة ذكية
    const cardData = DIALOGUES.magicWords.cards[cardType];
    const newLevel = Math.min(5, rainbowLevel + (cardData.adds || 2));
    setRainbowLevel(newLevel);

    Storage.addLog({
      type: 'magic_word_used',
      stageId: 'magic_words',
      label: `استخدم بطاقة: ${cardData.label}`,
      detail: `${currentRound.title} - ${cardData.text}`,
    });

    setShowCards(false);
    setLuluMood('talking');
    setCurrentPrompt(cardData.voice);

    sound.speak(cardData.voice, () => {
      if (newLevel >= 4 && !compromiseOffered) {
        // عرض الحل الوسط اللطيف
        setCompromiseOffered(true);
        setMotherMood('smiling');
        const compromiseSpeech = formatDialogue(
          currentRound.compromiseProposal,
          companion.name,
          companionDef.title,
          settings.childGender
        );
        setCurrentPrompt(compromiseSpeech);
        sound.playSuccessChime();

        sound.speak(compromiseSpeech, () => {
          setMotherMood('givingCookie');
          setLuluMood('happy');
          setRainbowLevel(5);

          const praiseText = formatDialogue(
            currentRound.fullRewardPraise,
            companion.name,
            companionDef.title,
            settings.childGender
          );
          setCurrentPrompt(praiseText);
          sound.playPraiseChant();

          confetti({
            particleCount: 65,
            spread: 75,
            origin: { y: 0.6 },
          });

          sound.speak(praiseText, () => {
            setIsSuccess(true);
            sound.playTada();
            onEarnStar(currentRound.icon, `بطل التفاوض: ${currentRound.title}`);
          }, 'praise_hero');
        });
      } else {
        // وصول مباشر للنجاح
        setMotherMood('givingCookie');
        setLuluMood('happy');
        const praiseText = formatDialogue(
          currentRound.fullRewardPraise,
          companion.name,
          companionDef.title,
          settings.childGender
        );
        setCurrentPrompt(praiseText);
        sound.playPraiseChant();

        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });

        sound.speak(praiseText, () => {
          setIsSuccess(true);
          sound.playTada();
          onEarnStar(currentRound.icon, `بطل التفاوض: ${currentRound.title}`);
        }, 'praise_hero');
      }
    }, 'magic_please');
  };

  const handleNextRound = () => {
    sound.playTap();
    setRoundIndex(prev => (prev + 1) % activeRoundsList.length);
  };

  const handlePrevRound = () => {
    sound.playTap();
    setRoundIndex(prev => (prev - 1 + activeRoundsList.length) % activeRoundsList.length);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-3 md:p-6 bg-gradient-to-b from-amber-100 via-orange-50 to-amber-100 overflow-x-hidden select-none">
      {/* الشريط العلوي */}
      <div className="flex items-center justify-between z-10 gap-2">
        <button
          onClick={() => {
            sound.playTap();
            onBack();
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/90 hover:bg-white text-amber-950 font-black shadow-md border-2 border-amber-300 text-xs md:text-sm touch-manipulation cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>

        {/* مؤشر قوس الأمل */}
        <div className="flex items-center gap-1.5 bg-white/95 px-3 py-1.5 rounded-2xl border-2 border-amber-300 shadow-xs">
          <span className="text-xs font-black text-amber-950">قوس الأمل:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(idx => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  idx <= rainbowLevel
                    ? `${rainbowColors[idx - 1]} scale-110 shadow-xs ring-1 ring-white`
                    : 'bg-slate-200 opacity-40'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SpeechSpeakerButton textToSpeak={currentPrompt} size="sm" />
        </div>
      </div>

      {/* شريط اختيار المواقف التربوية السريع */}
      <div className="w-full max-w-xl mx-auto my-2 z-10 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2 justify-start sm:justify-center min-w-max px-2">
          {activeRoundsList.map((round, idx) => (
            <button
              key={round.id || idx}
              onClick={() => {
                sound.playTap();
                setRoundIndex(idx);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border-2 touch-manipulation cursor-pointer shrink-0 ${
                idx === roundIndex
                  ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md scale-105'
                  : 'bg-white/80 text-slate-700 border-amber-200 hover:bg-white'
              }`}
            >
              <span>{round.icon}</span>
              <span className="truncate max-w-[100px]">{round.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* المشهد التفاعلي: ماما ولؤلؤ والمكافأة */}
      <div className="flex-1 flex flex-col items-center justify-center my-2 relative max-w-xl mx-auto w-full">
        {/* فقاعة الحديث الحالية */}
        <motion.div
          key={currentPrompt}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 border-3 border-amber-300 rounded-3xl p-3.5 md:p-4 shadow-lg text-center max-w-lg w-full mb-3 flex items-center gap-3"
        >
          <span className="text-3xl md:text-4xl shrink-0 filter drop-shadow">
            {motherMood === 'givingCookie' ? currentRound.icon : isCryingState ? '🥺' : companionDef.emoji}
          </span>
          <p className="text-sm md:text-base font-black text-amber-950 leading-relaxed text-right flex-1">
            {currentPrompt}
          </p>
        </motion.div>

        {/* الشخصيات والشيء المطلوب */}
        <div className="flex items-end justify-center gap-4 md:gap-8 w-full max-w-lg my-2">
          {/* ماما */}
          <div className="flex flex-col items-center">
            <MotherCharacter mood={motherMood} size="md" />
            <span className="text-xs font-bold text-amber-900 mt-1 bg-white/80 px-2 py-0.5 rounded-full border border-amber-200">
              ماما الحبيبة
            </span>
          </div>

          {/* الشيء المستهدف في المنتصف */}
          <div className="flex flex-col items-center mb-5">
            <motion.div
              animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl md:text-5xl filter drop-shadow-md"
            >
              {currentRound.icon}
            </motion.div>
            <span className="text-[10px] font-bold text-amber-900 mt-1 bg-amber-100/90 px-2 py-0.5 rounded-md">
              {currentRound.targetLabel}
            </span>
          </div>

          {/* الرفيق */}
          <div className="flex flex-col items-center">
            <LuluCharacter mood={luluMood} size="md" />
            <span className="text-xs font-bold text-amber-900 mt-1 bg-white/80 px-2 py-0.5 rounded-full border border-amber-200">
              {companion.name}
            </span>
          </div>
        </div>

        {/* صندوق النجاح والتنقل */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full bg-emerald-500 text-white rounded-3xl p-4 text-center shadow-xl border-4 border-white my-2 flex flex-col items-center gap-2.5 z-20"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
                <span className="text-lg md:text-xl font-black">اكتمل قوس الأمل وحصلت على الهدية!</span>
              </div>
              <p className="text-xs md:text-sm font-bold text-emerald-100">
                إقناعك اللطيف وحجتك المهذبة أسعدت ماما وحققت طلبك بحب!
              </p>
              <div className="flex gap-2 w-full max-w-sm mt-1">
                <button
                  onClick={handleNextRound}
                  className="flex-1 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-black rounded-2xl shadow text-xs md:text-sm flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <span>الموقف التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={resetScenarioState}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow text-xs md:text-sm flex items-center justify-center gap-1 cursor-pointer touch-manipulation"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* البطاقات الأربعة التفاعلية للتفاوض */}
      <div className="w-full max-w-xl mx-auto z-10 pb-1">
        <AnimatePresence mode="wait">
          {showCards && !isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="grid grid-cols-2 gap-2.5 md:gap-3"
            >
              {/* بطاقة 1: من فضلك */}
              <button
                onClick={() => handleCardClick('please')}
                className="h-28 md:h-32 rounded-3xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white p-2.5 flex flex-col items-center justify-center gap-1.5 shadow-lg border-3 border-emerald-300 touch-manipulation cursor-pointer transition transform active:scale-95"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                  🤲
                </div>
                <span className="font-black text-sm md:text-base">من فضلك يا ماما</span>
                <span className="text-[10px] text-emerald-100 font-bold bg-emerald-600/60 px-2 py-0.5 rounded-full">
                  طلب مهذب (+1)
                </span>
              </button>

              {/* بطاقة 2: بعد قليل / بعد العشاء */}
              <button
                onClick={() => handleCardClick('promiseAfterDinner')}
                className="h-28 md:h-32 rounded-3xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white p-2.5 flex flex-col items-center justify-center gap-1.5 shadow-lg border-3 border-blue-300 touch-manipulation cursor-pointer transition transform active:scale-95"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                  ⏰
                </div>
                <span className="font-black text-sm md:text-base">عرض: بعد قليل أو بعد الأكل</span>
                <span className="text-[10px] text-blue-100 font-bold bg-blue-600/60 px-2 py-0.5 rounded-full">
                  حجة ذكية (+2)
                </span>
              </button>

              {/* بطاقة 3: أساعدكِ أولاً */}
              <button
                onClick={() => handleCardClick('helpFirst')}
                className="h-28 md:h-32 rounded-3xl bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white p-2.5 flex flex-col items-center justify-center gap-1.5 shadow-lg border-3 border-purple-300 touch-manipulation cursor-pointer transition transform active:scale-95"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                  ✨
                </div>
                <span className="font-black text-sm md:text-base">أساعدكِ في الترتيب أولاً</span>
                <span className="text-[10px] text-purple-100 font-bold bg-purple-600/60 px-2 py-0.5 rounded-full">
                  تعاون رائع (+2)
                </span>
              </button>

              {/* بطاقة 4: خيار التعبير عن الحزن والبكاء */}
              <button
                onClick={() => handleCardClick('cryingOption')}
                className="h-28 md:h-32 rounded-3xl bg-rose-400 hover:bg-rose-500 active:bg-rose-600 text-white p-2.5 flex flex-col items-center justify-center gap-1.5 shadow-lg border-3 border-rose-300 touch-manipulation cursor-pointer transition transform active:scale-95"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                  😢
                </div>
                <span className="font-black text-sm md:text-base">أنا زعلان وأريد حضناً</span>
                <span className="text-[10px] text-rose-100 font-bold bg-rose-500/60 px-2 py-0.5 rounded-full">
                  تفريغ واحتواء
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
