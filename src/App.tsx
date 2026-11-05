import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  Lock,
  Volume2,
  X,
  ShoppingBag,
  Smile,
  Compass,
} from 'lucide-react';
import {
  EmotionType,
  StageId,
  BraveryStar,
  ParentSettings,
  CompanionProfile,
  StoryEpisode,
  WorldMapEpisode,
} from './types';
import { DIALOGUES, formatDialogue } from './data/dialogue';
import { STORY_EPISODES } from './data/episodes';
import { sound } from './utils/audio';
import { haptics } from './utils/haptics';
import { Storage } from './utils/storage';

import { LuluMood } from './components/LuluCharacter';
import { CompanionCharacter, COMPANIONS_DATA } from './components/CompanionCharacter';
import { CompanionSelectionModal } from './components/CompanionSelectionModal';
import { SpeechSpeakerButton } from './components/SpeechSpeakerButton';
import { BraveryBookModal } from './components/BraveryBookModal';
import { ParentModal } from './components/ParentModal';
import { SleepScreen } from './components/SleepScreen';
import { PWAInstallButton } from './components/PWAInstallButton';
import { StartScreen } from './components/StartScreen';
import { AudioTestModal } from './components/AudioTestModal';
import { VirtualShopModal } from './components/VirtualShopModal';
import { WorldMap } from './components/WorldMap';
import { StoryOverlay } from './components/StoryOverlay';

// الألعاب المصغرة المرتبطة بالقصة
import { StageMagicWords } from './components/stages/StageMagicWords';
import { StageHourglass } from './components/stages/StageHourglass';
import { StagePlanB } from './components/stages/StagePlanB';
import { StageBalloonBreathing } from './components/stages/StageBalloonBreathing';
import { StageWhenICry } from './components/stages/StageWhenICry';
import { StageMemoryGame } from './components/stages/StageMemoryGame';
import { StageZenBubbles } from './components/stages/StageZenBubbles';
import { StageSharing } from './components/stages/StageSharing';
import { StageEmpathy } from './components/stages/StageEmpathy';

// بيانات الحلقات الأساسية التي تعكس القصة المتسلسلة
interface EpisodeBaseConfig {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  stageId: StageId;
  emoji: string;
  color: string;
}

const EPISODES_BASE: EpisodeBaseConfig[] = [
  {
    id: 'ep_1',
    number: 1,
    title: 'بوابة الحارس الصخري',
    subtitle: 'استخدم الكلمات السحرية للإقناع وفتح البوابة',
    stageId: 'magic_words',
    emoji: '🪄',
    color: 'from-amber-400 to-orange-500',
  },
  {
    id: 'ep_2',
    number: 2,
    title: 'عاصفة جبل الغضب',
    subtitle: 'تنفس كالبالون لتهدئة الرياح الهائجة',
    stageId: 'rose_breathing',
    emoji: '🎈',
    color: 'from-rose-400 to-pink-500',
  },
  {
    id: 'ep_3',
    number: 3,
    title: 'عبّارة النهر البطيئة',
    subtitle: 'تدرّب على الصبر حتى تعبر النهر بأمان',
    stageId: 'hourglass',
    emoji: '⏳',
    color: 'from-sky-400 to-blue-500',
  },
  {
    id: 'ep_4',
    number: 4,
    title: 'الجسر المحطم',
    subtitle: 'ابتكر خطة بديلة ذكية للوصول للهدف',
    stageId: 'plan_b',
    emoji: '🧭',
    color: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'ep_5',
    number: 5,
    title: 'مملكة المشاركة العادلة',
    subtitle: 'تعلم تبادل الأدوار والمشاركة الودية',
    stageId: 'sharing',
    emoji: '🤝',
    color: 'from-teal-400 to-emerald-500',
  },
  {
    id: 'ep_6',
    number: 6,
    title: 'مرآة القلوب والتعاطف',
    subtitle: 'افهم مشاعر الأصدقاء وقدم لهم الدعم',
    stageId: 'empathy',
    emoji: '💖',
    color: 'from-pink-400 to-rose-500',
  },
  {
    id: 'ep_7',
    number: 7,
    title: 'برج الذاكرة الحكيم',
    subtitle: 'تحدي التركيز وتطابق الصور الذهبية',
    stageId: 'memory_game',
    emoji: '🃏',
    color: 'from-indigo-400 to-purple-500',
  },
  {
    id: 'ep_8',
    number: 8,
    title: 'واحة فقاعات الهدوء',
    subtitle: 'استرخِ وفجر الفقاعات لتفريغ التوتر',
    stageId: 'zen_bubbles',
    emoji: '🫧',
    color: 'from-cyan-400 to-sky-500',
  },
  {
    id: 'ep_9',
    number: 9,
    title: 'وادي الدموع والحضن الدافئ',
    subtitle: 'عبر عن مشاعرك واطلب عناقاً مريحاً',
    stageId: 'when_i_cry',
    emoji: '🫂',
    color: 'from-violet-400 to-purple-500',
  },
];

const EMOTIONS_CONFIG: Array<{
  type: EmotionType;
  label: string;
  emoji: string;
  color: string;
  ring: string;
}> = [
  {
    type: 'happy',
    label: 'سعيد',
    emoji: '😄',
    color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    ring: 'ring-emerald-400',
  },
  {
    type: 'sad',
    label: 'حزين',
    emoji: '😢',
    color: 'bg-sky-100 text-sky-900 border-sky-300',
    ring: 'ring-sky-400',
  },
  {
    type: 'angry',
    label: 'غاضب',
    emoji: '😠',
    color: 'bg-rose-100 text-rose-900 border-rose-300',
    ring: 'ring-rose-400',
  },
  {
    type: 'afraid',
    label: 'خائف',
    emoji: '😨',
    color: 'bg-purple-100 text-purple-900 border-purple-300',
    ring: 'ring-purple-400',
  },
];

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [activeStage, setActiveStage] = useState<StageId | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [stars, setStars] = useState<BraveryStar[]>([]);
  const [completedStages, setCompletedStages] = useState<StageId[]>(() => Storage.getCompletedStageIds());
  const [completedEpisodeIds, setCompletedEpisodeIds] = useState<string[]>(() => Storage.getCompletedEpisodeIds());
  const [settings, setSettings] = useState<ParentSettings>(Storage.getSettings());

  // حالة نظام الرواية المرئية
  const [activeStoryEpisode, setActiveStoryEpisode] = useState<StoryEpisode | null>(null);
  const [storyMode, setStoryMode] = useState<'intro' | 'victory' | null>(null);

  const [luluMood, setLuluMood] = useState<LuluMood>('idle');
  const [homePrompt, setHomePrompt] = useState<string>(DIALOGUES.welcome.greeting);

  const [companionProfile, setCompanionProfile] = useState<CompanionProfile>(() => Storage.getCompanionProfile());
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false);
  const [hasChosenInitial, setHasChosenInitial] = useState(() => Storage.hasChosenInitialCompanion());
  const [friendUnlockBanner, setFriendUnlockBanner] = useState<string | null>(null);

  const companionDef = COMPANIONS_DATA[companionProfile.type] || COMPANIONS_DATA.lion;

  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isParentOpen, setIsParentOpen] = useState(false);
  const [isAudioTestOpen, setIsAudioTestOpen] = useState(false);
  const [isSleepMode, setIsSleepMode] = useState(false);

  const [parentHoldProgress, setParentHoldProgress] = useState(0);
  const parentHoldTimerRef = useRef<number | null>(null);
  const parentHoldStartRef = useRef<number | null>(null);

  // تحديث وقت اللعب وفحص حد الوالدين
  useEffect(() => {
    setStars(Storage.getStars());
    setCompletedStages(Storage.getCompletedStageIds());
    setCompletedEpisodeIds(Storage.getCompletedEpisodeIds());

    // لا ينبغي أن يستمر العداد أثناء شاشة النوم أو لوحة الوالدين؛
    // وإلا سيعيد تفعيل شاشة النوم فور فتح اللوحة من شاشة انتهاء الوقت.
    if (isSleepMode || isParentOpen) return;

    const interval = setInterval(() => {
      const secs = Storage.incrementPlaySeconds(5);
      const limitSecs = settings.dailyLimitMinutes * 60;
      if (!isParentOpen && !isSleepMode && settings.dailyLimitMinutes < 999 && secs >= limitSecs) {
        setIsSleepMode(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [settings.dailyLimitMinutes, isParentOpen, isSleepMode]);

  // نطق ترحيبي عند فتح التطبيق
  useEffect(() => {
    if (hasStarted && hasChosenInitial && !activeStage && !activeStoryEpisode && !isSleepMode) {
      const text = formatDialogue(homePrompt, companionProfile.name, companionDef.title);
      sound.speak(text);
    }
  }, [hasStarted, hasChosenInitial, activeStage, activeStoryEpisode, isSleepMode]);

  // حساب حالة كل حلقة في خريطة العالم المتعرجة بدقة
  let foundCurrent = false;
  const EPISODES_DATA: WorldMapEpisode[] = EPISODES_BASE.map((ep, idx) => {
    const isCompleted =
      completedStages.includes(ep.stageId) ||
      completedEpisodeIds.includes(ep.id) ||
      completedEpisodeIds.includes(`ep_${ep.number}`);

    // الحلقة مفتوحة إذا كانت الأولى أو تم إكمال الحلقة السابقة
    const isPreviousCompleted =
      idx === 0 ||
      completedStages.includes(EPISODES_BASE[idx - 1].stageId) ||
      completedEpisodeIds.includes(EPISODES_BASE[idx - 1].id) ||
      completedEpisodeIds.includes(`ep_${EPISODES_BASE[idx - 1].number}`);

    const isLocked = !isCompleted && !isPreviousCompleted;

    let isCurrent = false;
    if (!isCompleted && !isLocked && !foundCurrent) {
      isCurrent = true;
      foundCurrent = true;
    }

    return {
      id: ep.id,
      number: ep.number,
      title: ep.title,
      subtitle: ep.subtitle,
      color: ep.color,
      emoji: ep.emoji,
      stageId: ep.stageId,
      isCompleted,
      isLocked,
      isCurrent,
    };
  });

  // إذا تم إكمال جميع الحلقات، تصبح الأخيرة هي الحالية كإنجاز كامل
  if (!foundCurrent && EPISODES_DATA.length > 0) {
    EPISODES_DATA[EPISODES_DATA.length - 1].isCurrent = true;
  }

  // تفاعل الطفل مع مشاعره
  const handleSelectEmotion = (emotion: EmotionType) => {
    sound.playTap();
    haptics.tap();
    setSelectedEmotion(emotion);
    Storage.logEmotion(emotion);

    const rawFeedback = DIALOGUES.welcome.afterEmotion[emotion];
    const feedback = formatDialogue(rawFeedback, companionProfile.name, companionDef.title);
    setHomePrompt(feedback);

    if (emotion === 'happy') setLuluMood('happy');
    else if (emotion === 'sad') setLuluMood('comforting');
    else if (emotion === 'angry') setLuluMood('idle');
    else setLuluMood('talking');

    sound.speak(feedback, () => {
      setTimeout(() => {
        setLuluMood('idle');
      }, 2000);
    });
  };

  // اختيار حلقة من خريطة العالم لبدء الرواية المرئية أو التحدي
  const handleSelectEpisode = (episode: WorldMapEpisode) => {
    sound.playTap();
    haptics.tap();

    // البحث عن القصة التفاعلية المرتبطة بالمرحلة
    const storyEpisode = STORY_EPISODES.find(
      (s) => s.stageId === episode.stageId || s.id === episode.id
    );

    if (storyEpisode) {
      const adaptedStory: StoryEpisode = {
        ...storyEpisode,
        title: episode.title,
        subtitle: episode.subtitle,
      };
      setActiveStoryEpisode(adaptedStory);
      setStoryMode('intro');
      Storage.setCurrentEpisodeId(episode.id);
    } else if (episode.stageId) {
      setActiveStage(episode.stageId);
    }
  };

  // الانتقال من مرحلة القصة إلى التحدي / اللعبة المصغرة
  const handleStartChallenge = () => {
    if (!activeStoryEpisode) return;
    sound.playTap();
    haptics.tap();
    setActiveStage(activeStoryEpisode.stageId);
  };

  // إنهاء حلقة القصة بعد حوار الانتصار والعودة إلى الخريطة
  const handleFinishEpisode = () => {
    sound.playSuccessChime();
    haptics.success();
    setActiveStoryEpisode(null);
    setStoryMode(null);
    setCompletedEpisodeIds(Storage.getCompletedEpisodeIds());
    setCompletedStages(Storage.getCompletedStageIds());
    setStars(Storage.getStars());
    setCompanionProfile(Storage.getCompanionProfile());
  };

  // استلام حدث النجاح (Star + Victory) من اللعبة المصغرة
  const handleEarnStar = (sticker: string, note: string) => {
    const stageId = activeStage || (activeStoryEpisode ? activeStoryEpisode.stageId : 'magic_words');
    const matchedEp = EPISODES_BASE.find((e) => e.stageId === stageId);

    // 1. إضافة نجمة الشجاعة وحفظها
    const newStar = Storage.addStar({
      stageId,
      stageTitle: matchedEp ? matchedEp.title : `مرحلة ${companionProfile.name}`,
      sticker: sticker || '⭐',
      note,
    });
    const updatedStars = [newStar, ...stars];
    setStars(updatedStars);

    // 2. مكافأة العملات الذهبية
    const currentCoins = companionProfile.coins || 0;
    const updatedProfWithCoins = Storage.saveCompanionProfile({
      coins: currentCoins + 25,
    });
    setCompanionProfile(updatedProfWithCoins);

    // 3. تحديث مرحلة الإنجاز في التخزين
    Storage.markStageCompleted(stageId);
    if (matchedEp) {
      Storage.markEpisodeCompleted(matchedEp.id);
    }
    if (activeStoryEpisode) {
      Storage.markEpisodeCompleted(activeStoryEpisode.id);
    }

    setCompletedStages(Storage.getCompletedStageIds());
    setCompletedEpisodeIds(Storage.getCompletedEpisodeIds());

    // 4. فحص فتح أصدقاء جدد
    const prevUnlockedCount = companionProfile.unlockedTypes.length;
    const finalProf = Storage.checkAndUpdateStarUnlocks(updatedStars.length);
    if (finalProf.unlockedTypes.length > prevUnlockedCount) {
      setCompanionProfile(finalProf);
      setFriendUnlockBanner('صديق جديد متاح الآن!');
      sound.playSuccessChime();
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      sound.speak('لقد انضم إلينا صديق جديد!');
    }

    // 5. التحول إلى حوار الانتصار أو الاحتفال
    setActiveStage(null);
    if (activeStoryEpisode) {
      setStoryMode('victory');
    } else {
      sound.playSuccessChime();
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    }
  };

  const handleBackFromStage = () => {
    sound.playTap();
    haptics.tap();
    setActiveStage(null);
  };

  // قفل الوالدين الذكي (ضغط 3 ثوانٍ)
  const handleParentLockPointerDown = () => {
    parentHoldStartRef.current = Date.now();
    sound.playTap();
    haptics.tap();

    const checkLoop = () => {
      if (!parentHoldStartRef.current) return;
      const elapsed = Date.now() - parentHoldStartRef.current;
      const progress = Math.min(1, elapsed / 3000);
      setParentHoldProgress(progress);

      if (progress >= 1) {
        setParentHoldProgress(0);
        setIsParentOpen(true);
        sound.playSuccessChime();
        haptics.success();
      } else {
        parentHoldTimerRef.current = requestAnimationFrame(checkLoop);
      }
    };
    parentHoldTimerRef.current = requestAnimationFrame(checkLoop);
  };

  const handleParentLockPointerUp = () => {
    parentHoldStartRef.current = null;
    if (parentHoldTimerRef.current) {
      cancelAnimationFrame(parentHoldTimerRef.current);
    }
    setParentHoldProgress(0);
  };

  const updateProfileDisplay = () => {
    setCompanionProfile(Storage.getCompanionProfile());
  };

  if (!hasStarted) return <StartScreen onStart={() => setHasStarted(true)} />;

  if (!hasChosenInitial) {
    return (
      <CompanionSelectionModal
        isOpen={true}
        isInitialSetup={true}
        initialType={companionProfile.type}
        initialName={companionProfile.name}
        onCompanionSelected={(newProf) => {
          setCompanionProfile(newProf);
          setHasChosenInitial(true);
          const greeting = formatDialogue(
            DIALOGUES.welcome.greeting,
            newProf.name,
            COMPANIONS_DATA[newProf.type].title
          );
          setHomePrompt(greeting);
          sound.speak(greeting);
        }}
      />
    );
  }

  if (isSleepMode) {
    return (
      <SleepScreen
        onParentUnlock={() => {
          setIsSleepMode(false);
          setIsParentOpen(true);
        }}
      />
    );
  }

  // إذا كانت اللعبة المصغرة نشطة حالياً، يتم عرضها
  if (activeStage === 'sharing') {
    return <StageSharing onBack={handleBackFromStage} onEarnStar={handleEarnStar} />;
  }
  if (activeStage === 'empathy') {
    return <StageEmpathy onBack={handleBackFromStage} onEarnStar={handleEarnStar} />;
  }
  if (activeStage === 'memory_game') {
    return (
      <StageMemoryGame
        onBack={() => {
          updateProfileDisplay();
          handleBackFromStage();
        }}
        onEarnStar={handleEarnStar}
      />
    );
  }
  if (activeStage === 'zen_bubbles') {
    return (
      <StageZenBubbles
        onBack={() => {
          updateProfileDisplay();
          handleBackFromStage();
        }}
        onEarnStar={handleEarnStar}
      />
    );
  }
  if (activeStage === 'magic_words') {
    return <StageMagicWords onBack={handleBackFromStage} onEarnStar={handleEarnStar} />;
  }
  if (activeStage === 'hourglass') {
    return <StageHourglass onBack={handleBackFromStage} onEarnStar={handleEarnStar} />;
  }
  if (activeStage === 'plan_b') {
    return <StagePlanB onBack={handleBackFromStage} onEarnStar={handleEarnStar} />;
  }
  if (activeStage === 'rose_breathing') {
    return <StageBalloonBreathing onBack={handleBackFromStage} onEarnStar={handleEarnStar} />;
  }
  if (activeStage === 'when_i_cry') {
    return <StageWhenICry onBack={handleBackFromStage} onEarnStar={handleEarnStar} />;
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-3 md:p-6 bg-gradient-to-b from-amber-100 via-amber-50 to-emerald-100 overflow-x-hidden select-none">
      {/* خلفية جمالية لطيفة */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-emerald-400 blur-3xl" />
        <div className="absolute top-1/2 -right-10 w-72 h-72 rounded-full bg-amber-400 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-lime-300 blur-3xl" />
      </div>

      {/* الشريط العلوي العام */}
      <header className="relative z-20 flex items-center justify-between gap-2 max-w-xl mx-auto w-full">
        <div className="flex gap-2">
          {/* كتاب الشجاعة والنجوم */}
          <button
            onClick={() => {
              sound.playTap();
              haptics.tap();
              setIsBookOpen(true);
            }}
            title="سجل النجوم والشجاعة"
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full bg-white/95 hover:bg-white text-amber-950 font-black shadow-md border-2 border-amber-300 touch-manipulation cursor-pointer transition transform active:scale-95"
          >
            <Star className="w-5 h-5 text-amber-500 fill-amber-400 animate-pulse" />
            <span className="text-base font-black">{stars.length}</span>
          </button>

          {/* المتجر الافتراضي */}
          <button
            onClick={() => {
              sound.playTap();
              haptics.tap();
              setIsShopOpen(true);
            }}
            title="المتجر السحري"
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full bg-white/95 hover:bg-white text-emerald-950 font-black shadow-md border-2 border-emerald-300 touch-manipulation cursor-pointer transition transform active:scale-95"
          >
            <ShoppingBag className="w-5 h-5 text-emerald-500" />
            <span className="text-base font-black">{companionProfile.coins || 0}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* ملف الصديق وتغييره */}
          <button
            onClick={() => {
              sound.playTap();
              haptics.tap();
              setIsCompanionModalOpen(true);
            }}
            title="اختيار الصديق"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/95 hover:bg-white text-amber-950 font-black shadow-md border-2 border-amber-300 touch-manipulation cursor-pointer transition transform active:scale-95"
          >
            <span className="text-xl filter drop-shadow">{companionDef.emoji}</span>
            <span className="text-xs md:text-sm font-black hidden sm:inline">{companionProfile.name}</span>
          </button>

          {/* اختبار الصوت */}
          <button
            onClick={() => {
              sound.playTap();
              setIsAudioTestOpen(true);
            }}
            title="اختبار الصوت والنطق"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs md:text-sm font-black shadow-md border-2 border-amber-200 cursor-pointer touch-manipulation transition transform active:scale-95"
          >
            <Volume2 className="w-4 h-4 animate-bounce" />
          </button>

          <PWAInstallButton />

          {/* قفل الوالدين */}
          <button
            onClick={() => {
              sound.playTap();
              setIsParentOpen(true);
            }}
            onPointerDown={handleParentLockPointerDown}
            onPointerUp={handleParentLockPointerUp}
            onPointerLeave={handleParentLockPointerUp}
            title="إعدادات الوالدين والتخصيص (اضغط مطولاً 3 ثوانٍ)"
            className="relative w-10 h-10 rounded-full bg-white/90 hover:bg-white border-2 border-indigo-200 text-indigo-700 flex items-center justify-center cursor-pointer touch-manipulation shadow-sm transition active:scale-95"
          >
            {parentHoldProgress > 0 && (
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  stroke="#6366f1"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="100"
                  strokeDashoffset={100 - parentHoldProgress * 100}
                />
              </svg>
            )}
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* تنبيه فتح صديق جديد */}
      {friendUnlockBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 max-w-xl mx-auto w-full my-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between border-2 border-emerald-300"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">🎁</span>
            <span className="text-xs md:text-sm font-black">{friendUnlockBanner}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                sound.playTap();
                setIsCompanionModalOpen(true);
                setFriendUnlockBanner(null);
              }}
              className="px-2.5 py-1 bg-white text-emerald-950 font-black rounded-xl text-xs shadow-xs cursor-pointer active:scale-95"
            >
              استكشف
            </button>
            <button
              onClick={() => setFriendUnlockBanner(null)}
              className="p-1 hover:bg-white/20 rounded-full text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* المحتوى الرئيسي: الترحيب وفحص المشاعر وخريطة العالم المتعرجة */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start my-2 max-w-xl mx-auto w-full">
        {/* بطاقة الترحيب التفاعلية */}
        <motion.div
          key={homePrompt}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 border-2 border-amber-300 rounded-3xl p-3 md:p-4 shadow-md text-center w-full mb-3 flex items-center gap-3"
        >
          <SpeechSpeakerButton
            textToSpeak={formatDialogue(homePrompt, companionProfile.name, companionDef.title)}
            size="md"
          />
          <p className="text-base md:text-xl font-black text-amber-950 leading-relaxed text-right flex-1">
            {formatDialogue(homePrompt, companionProfile.name, companionDef.title)}
          </p>
        </motion.div>

        {/* أزرار المشاعر السريعة */}
        <div className="w-full mb-4">
          <div className="flex items-center justify-between mb-1.5 px-2">
            <span className="text-xs md:text-sm font-bold text-amber-900 flex items-center gap-1">
              <Smile className="w-4 h-4 text-amber-600" />
              <span>بماذا تشعر الآن؟:</span>
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {EMOTIONS_CONFIG.map((item) => (
              <button
                key={item.type}
                onClick={() => handleSelectEmotion(item.type)}
                className={`py-2 px-1 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 shadow-xs transition transform active:scale-90 touch-manipulation cursor-pointer ${
                  item.color
                } ${
                  selectedEmotion === item.type
                    ? `ring-3 ${item.ring} scale-105 shadow-md font-black`
                    : 'hover:opacity-90'
                }`}
              >
                <span className="text-2xl filter drop-shadow-sm">{item.emoji}</span>
                <span className="text-xs font-bold text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* خريطة العالم التفاعلية المتعرجة (Zig-Zag World Map) */}
        <div className="w-full">
          <WorldMap
            episodes={EPISODES_DATA}
            companionType={companionProfile.type}
            onSelectEpisode={handleSelectEpisode}
          />
        </div>
      </main>

      {/* محرك الرواية المرئية (Story Overlay) إن كان نشطاً */}
      <AnimatePresence>
        {activeStoryEpisode && storyMode && (
          <StoryOverlay
            episode={activeStoryEpisode}
            mode={storyMode}
            onStartChallenge={handleStartChallenge}
            onFinishEpisode={handleFinishEpisode}
            onClose={() => {
              setActiveStoryEpisode(null);
              setStoryMode(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* نوافذ الدعم والأنشطة */}
      <CompanionSelectionModal
        isOpen={isCompanionModalOpen}
        onClose={() => setIsCompanionModalOpen(false)}
        initialType={companionProfile.type}
        initialName={companionProfile.name}
        isInitialSetup={false}
        onCompanionSelected={(newProf) => {
          setCompanionProfile(newProf);
          setIsCompanionModalOpen(false);
          const greeting = formatDialogue(
            DIALOGUES.welcome.greeting,
            newProf.name,
            COMPANIONS_DATA[newProf.type].title
          );
          setHomePrompt(greeting);
          sound.speak(`أهلاً بك يا ${newProf.name}!`);
        }}
      />

      <BraveryBookModal isOpen={isBookOpen} onClose={() => setIsBookOpen(false)} stars={stars} />

      <VirtualShopModal
        isOpen={isShopOpen}
        onClose={() => {
          setIsShopOpen(false);
          updateProfileDisplay();
        }}
        onProfileUpdated={(newProf) => setCompanionProfile(newProf)}
      />

      <ParentModal
        isOpen={isParentOpen}
        onClose={() => setIsParentOpen(false)}
        onSettingsUpdated={() => setSettings(Storage.getSettings())}
      />

      <AudioTestModal isOpen={isAudioTestOpen} onClose={() => setIsAudioTestOpen(false)} />
    </div>
  );
}
