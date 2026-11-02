import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Check, X, Lock, Star, Sparkles, ArrowRight, ArrowLeft, Edit3, Volume2 } from 'lucide-react';
import { CompanionType, CompanionProfile } from '../types';
import { COMPANIONS_DATA, CompanionCharacter } from './CompanionCharacter';
import { Storage } from '../utils/storage';
import { sound } from '../utils/audio';

interface CompanionSelectionModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCompanionSelected: (profile: CompanionProfile) => void;
  initialType?: CompanionType;
  initialName?: string;
  isInitialSetup?: boolean;
}

const PRESET_NAMES = [
  { name: 'لؤلؤ', emoji: '🦁' },
  { name: 'نجمة', emoji: '⭐' },
  { name: 'بطل', emoji: '🏆' },
  { name: 'زيزي', emoji: '🌸' },
  { name: 'سوسو', emoji: '🍬' },
  { name: 'دودو', emoji: '🎈' },
  { name: 'ميمو', emoji: '🐼' },
  { name: 'تيتو', emoji: '🐘' },
];

export const CompanionSelectionModal: React.FC<CompanionSelectionModalProps> = ({
  isOpen,
  onClose,
  onCompanionSelected,
  initialType = 'lion',
  initialName = 'لؤلؤ',
  isInitialSetup = false,
}) => {
  const [step, setStep] = useState<'choose' | 'name'>('choose');
  const [selectedType, setSelectedType] = useState<CompanionType>(initialType);
  const [chosenName, setChosenName] = useState<string>(initialName);
  const [starsCount, setStarsCount] = useState<number>(0);
  const [unlockedTypes, setUnlockedTypes] = useState<CompanionType[]>([]);

  // حالة الاسم المخصص عبر قفل الأهل
  const [isCustomNameOpen, setIsCustomNameOpen] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');
  const [isMathGateOpen, setIsMathGateOpen] = useState(false);
  const [mathQuestion, setMathQuestion] = useState({ a: 4, b: 3, answer: 7 });
  const [mathInput, setMathInput] = useState('');
  const [mathError, setMathError] = useState(false);

  // ضغط مطول 3 ثوانٍ
  const [parentHoldProgress, setParentHoldProgress] = useState(0);
  const parentHoldTimerRef = useRef<number | null>(null);
  const parentHoldStartRef = useRef<number | null>(null);

  // حالة النطق للترحيب بالاسم
  const [greetingText, setGreetingText] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const stars = Storage.getStars();
      setStarsCount(stars.length);
      const profile = Storage.getCompanionProfile();
      setSelectedType(profile.type);
      setChosenName(profile.name);
      setUnlockedTypes(profile.unlockedTypes);
      setStep('choose');
      setGreetingText('');
      setIsCustomNameOpen(false);
      setIsMathGateOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDef = COMPANIONS_DATA[selectedType];
  const isTypeUnlocked = (type: CompanionType) => {
    const def = COMPANIONS_DATA[type];
    if (def.starsRequiredToUnlock === 0) return true;
    return starsCount >= def.starsRequiredToUnlock || unlockedTypes.includes(type);
  };

  const handleSelectType = (type: CompanionType) => {
    sound.playTap();
    if (!isTypeUnlocked(type)) {
      const def = COMPANIONS_DATA[type];
      sound.speak(`هذا الصديق يحتاج إلى ${def.starsRequiredToUnlock} نجوم شجاعة لفتحه! العب واجمع النجوم!`);
      return;
    }
    setSelectedType(type);
    // اقتراح الاسم الافتراضي للشخصية
    setChosenName(COMPANIONS_DATA[type].defaultName);
  };

  const handleConfirmType = () => {
    sound.playSuccessChime();
    setStep('name');
    const intro = `مرحباً! اختر اسماً لصديقك الجديد: ${currentDef.title}`;
    sound.speak(intro);
  };

  const handleSelectName = (name: string) => {
    sound.playTap();
    setChosenName(name);
    const speech = `اسمي ${name}!`;
    setGreetingText(speech);
    sound.playSuccessChime();
    sound.speak(speech);
  };

  // معالجة الضغط المطول على قفل الأهل للاسم المخصص
  const handleHoldPointerDown = () => {
    parentHoldStartRef.current = Date.now();
    sound.playTap();

    const checkLoop = () => {
      if (!parentHoldStartRef.current) return;
      const elapsed = Date.now() - parentHoldStartRef.current;
      const progress = Math.min(1, elapsed / 3000);
      setParentHoldProgress(progress);

      if (progress >= 1) {
        parentHoldStartRef.current = null;
        setParentHoldProgress(0);
        generateMathProblem();
        setIsMathGateOpen(true);
        sound.playSuccessChime();
      } else {
        parentHoldTimerRef.current = requestAnimationFrame(checkLoop);
      }
    };

    parentHoldTimerRef.current = requestAnimationFrame(checkLoop);
  };

  const handleHoldPointerUp = () => {
    parentHoldStartRef.current = null;
    if (parentHoldTimerRef.current) {
      cancelAnimationFrame(parentHoldTimerRef.current);
    }
    setParentHoldProgress(0);
  };

  const generateMathProblem = () => {
    const a = Math.floor(Math.random() * 6) + 3;
    const b = Math.floor(Math.random() * 5) + 2;
    setMathQuestion({ a, b, answer: a + b });
    setMathInput('');
    setMathError(false);
  };

  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(mathInput.trim(), 10) === mathQuestion.answer) {
      setIsMathGateOpen(false);
      setIsCustomNameOpen(true);
      sound.playSuccessChime();
    } else {
      setMathError(true);
      sound.playTap();
    }
  };

  const handleCustomNameConfirm = () => {
    if (customNameInput.trim()) {
      const name = customNameInput.trim();
      setChosenName(name);
      setIsCustomNameOpen(false);
      const speech = `اسمي ${name}!`;
      setGreetingText(speech);
      sound.playSuccessChime();
      sound.speak(speech);
    }
  };

  const handleFinalSave = () => {
    sound.playTada();
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 },
    });

    const updated = Storage.saveCompanionProfile({
      type: selectedType,
      name: chosenName.trim() || currentDef.defaultName,
    });
    Storage.markInitialCompanionChosen();

    onCompanionSelected(updated);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-2xl bg-gradient-to-b from-amber-50 to-orange-50 border-4 border-amber-300 rounded-3xl p-5 md:p-7 shadow-2xl text-amber-950 flex flex-col justify-between my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* زر الإغلاق إذا لم تكن البداية الأولى الإلزامية */}
        {!isInitialSetup && onClose && (
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-600 border-2 border-slate-300 flex items-center justify-center shadow-md cursor-pointer transition transform active:scale-95"
            title="إغلاق"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* رأس النافذة */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 text-xs md:text-sm font-black mb-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>{step === 'choose' ? 'الخطوة 1: اختيار الصديق' : 'الخطوة 2: تسمية الصديق'}</span>
            <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-full text-amber-950 text-xs mr-2">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>{starsCount} نجمة</span>
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-amber-950">
            {step === 'choose' ? 'اختر رفيقك للمغامرة! 🐾' : `ماذا نحب أن ننادي صديقنا؟ ✨`}
          </h2>
          <p className="text-sm md:text-base font-bold text-amber-800 mt-1">
            {step === 'choose'
              ? 'المس أي صديق لتراه يلوّح لك، ثم اضغط زر التأكيد'
              : `صديقك ${currentDef.title} ينتظر اسمه الجديد بفرح!`}
          </p>
        </div>

        {/* الخطوة 1: اختيار الصديق */}
        {step === 'choose' && (
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 my-2">
              {(Object.keys(COMPANIONS_DATA) as CompanionType[]).map((type) => {
                const def = COMPANIONS_DATA[type];
                const isSelected = selectedType === type;
                const unlocked = isTypeUnlocked(type);

                return (
                  <button
                    key={type}
                    onClick={() => handleSelectType(type)}
                    className={`relative min-h-[140px] md:min-h-[160px] p-3 rounded-3xl border-3 flex flex-col items-center justify-between text-center transition-all duration-200 cursor-pointer touch-manipulation transform ${
                      isSelected
                        ? 'bg-white border-amber-500 shadow-xl scale-105 ring-4 ring-amber-400/60'
                        : unlocked
                        ? 'bg-white/80 border-amber-200 hover:bg-white hover:border-amber-300 shadow-md active:scale-95'
                        : 'bg-slate-100/80 border-slate-300 opacity-70'
                    }`}
                  >
                    {/* شارة القفل إن كان مقفلاً */}
                    {!unlocked && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-slate-800/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-20">
                        <Lock className="w-3 h-3 text-amber-300" />
                        <span>{def.starsRequiredToUnlock} ⭐</span>
                      </div>
                    )}

                    {/* علامة الاختيار */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md z-20">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}

                    {/* شخصية الرفيق التفاعلية */}
                    <div className="w-24 h-24 md:w-28 md:h-28 flex items-center justify-center my-1 pointer-events-none">
                      <CompanionCharacter
                        type={type}
                        mood={isSelected ? 'waving' : 'idle'}
                        size="sm"
                      />
                    </div>

                    <div className="w-full">
                      <span className="block text-sm md:text-base font-black text-amber-950">
                        {def.title}
                      </span>
                      <span className="block text-[11px] font-bold text-amber-700 truncate">
                        {unlocked ? def.desc : `اجمع ${def.starsRequiredToUnlock} نجوم لفتحه`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* زر تأكيد الاختيار والانتقال للتسمية */}
            <div className="pt-2">
              <button
                onClick={handleConfirmType}
                className="w-full py-4 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-white text-lg md:text-xl font-black shadow-xl flex items-center justify-center gap-3 cursor-pointer touch-manipulation border-3 border-amber-200"
              >
                <span>اخترت {currentDef.title}</span>
                <Check className="w-7 h-7 stroke-[3] animate-bounce" />
              </button>
            </div>
          </div>
        )}

        {/* الخطوة 2: تسمية الصديق */}
        {step === 'name' && (
          <div className="flex-1 flex flex-col items-center justify-between space-y-4">
            {/* عرض الصديق المختار بحجم لطيف ومبتسم */}
            <div className="flex flex-col items-center justify-center my-1">
              <div className="w-36 h-36 md:w-44 md:h-44 flex items-center justify-center">
                <CompanionCharacter
                  type={selectedType}
                  mood={greetingText ? 'happy' : 'idle'}
                  size="md"
                />
              </div>

              {/* فقاعة حديث بنص كبير: اسمي [الاسم] */}
              {greetingText && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="bg-white border-3 border-amber-400 rounded-3xl px-6 py-2.5 shadow-lg text-center my-1 flex items-center gap-2"
                >
                  <span className="text-2xl">{currentDef.emoji}</span>
                  <span className="text-xl md:text-2xl font-black text-amber-950">
                    {greetingText}
                  </span>
                  <button
                    onClick={() => sound.speak(greetingText)}
                    className="p-1 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200"
                    title="استمع"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </div>

            {/* صف من 8 أسماء مقترحة بأزرار ضخمة واضحة */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs md:text-sm font-black text-amber-900">
                  اختر من الأسماء المقترحة اللطيفة:
                </span>
                <span className="text-xs font-bold text-amber-700">
                  الاسم المختار: <strong className="text-amber-950 text-sm font-black underline">{chosenName}</strong>
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 md:gap-3">
                {PRESET_NAMES.map((item) => {
                  const isSelected = chosenName === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleSelectName(item.name)}
                      className={`h-16 md:h-20 rounded-2xl border-3 flex flex-col items-center justify-center gap-0.5 text-center transition-all cursor-pointer touch-manipulation transform ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 shadow-lg scale-105 font-black ring-4 ring-amber-300'
                          : 'bg-white hover:bg-amber-100/70 text-amber-950 border-amber-200 shadow-sm active:scale-95 font-bold'
                      }`}
                    >
                      <span className="text-base md:text-lg">{item.emoji}</span>
                      <span className="text-sm md:text-base">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* زر اسم آخر بقفل الأهل */}
            <div className="w-full flex items-center justify-between pt-1 px-1">
              {/* زر الرجوع لاختيار شكل آخر */}
              <button
                onClick={() => {
                  sound.playTap();
                  setStep('choose');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs md:text-sm border-2 border-amber-200 shadow-sm cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>تغيير الشكل</span>
              </button>

              {/* زر اسم مخصص بقفل الأهل (ضغط 3 ثوانٍ) */}
              <div
                onPointerDown={handleHoldPointerDown}
                onPointerUp={handleHoldPointerUp}
                onPointerLeave={handleHoldPointerUp}
                className="relative flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-amber-50 border-2 border-amber-300 text-amber-900 font-black text-xs md:text-sm cursor-pointer touch-manipulation shadow-sm select-none"
                title="اضغط 3 ثوانٍ لكتابة اسم آخر"
              >
                {parentHoldProgress > 0 && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none rounded-2xl">
                    <rect
                      x="2"
                      y="2"
                      width="96%"
                      height="88%"
                      rx="14"
                      stroke="#f59e0b"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="280"
                      strokeDashoffset={280 - parentHoldProgress * 280}
                    />
                  </svg>
                )}
                <Lock className="w-4 h-4 text-amber-600" />
                <span>اسم آخر (قفل الأهل 3 ثوانٍ)</span>
                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>

            {/* حقل إدخال الاسم المخصص إن فُتح */}
            {isCustomNameOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="w-full bg-white border-2 border-amber-400 rounded-2xl p-3 shadow-md flex items-center gap-2"
              >
                <input
                  type="text"
                  maxLength={16}
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  placeholder="اكتب اسم الصديق هنا..."
                  className="flex-1 px-3 py-2 border-2 border-amber-300 rounded-xl text-base font-bold text-amber-950 focus:outline-hidden focus:border-amber-500"
                />
                <button
                  onClick={handleCustomNameConfirm}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-sm text-sm"
                >
                  حفظ الاسم
                </button>
              </motion.div>
            )}

            {/* نافذة المسألة الرياضية لقفل الأهل */}
            {isMathGateOpen && (
              <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center border-4 border-amber-300 shadow-2xl">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-black text-amber-950 mb-1">منطقة الأهل</h4>
                  <p className="text-xs text-amber-800 mb-3 font-bold">حل المسألة لفتح كتابة اسم مخصص:</p>
                  <form onSubmit={handleMathSubmit} className="space-y-3">
                    <div className="text-2xl font-black text-amber-900 bg-amber-50 py-2 rounded-xl border border-amber-200">
                      {mathQuestion.a} + {mathQuestion.b} = ؟
                    </div>
                    <input
                      type="number"
                      autoFocus
                      value={mathInput}
                      onChange={(e) => setMathInput(e.target.value)}
                      placeholder="الناتج"
                      className="w-full text-center text-xl font-bold py-2 border-2 border-amber-300 rounded-xl focus:outline-hidden"
                    />
                    {mathError && (
                      <p className="text-xs text-rose-600 font-bold">إجابة غير صحيحة، حاول مجدداً</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMathGateOpen(false)}
                        className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold"
                      >
                        تأكيد
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* زر الانطلاق الكبير النهائي */}
            <div className="w-full pt-2">
              <button
                onClick={handleFinalSave}
                className="w-full py-4 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white text-xl md:text-2xl font-black shadow-xl flex items-center justify-center gap-3 cursor-pointer touch-manipulation transform active:scale-98 border-3 border-emerald-200"
              >
                <span>انطلق مع {chosenName}! 🚀</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
