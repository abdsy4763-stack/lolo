import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { ArrowRight, RotateCcw, Volume2, Mic, MicOff, Hand, Sliders, Wind, Heart, Sparkles, Check, Smile, X } from 'lucide-react';
import { LuluCharacter, LuluMood } from '../LuluCharacter';
import { SpeechSpeakerButton } from '../SpeechSpeakerButton';
import { DIALOGUES, formatDialogue } from '../../data/dialogue';
import { sound } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { Storage } from '../../utils/storage';
import { COMPANIONS_DATA } from '../CompanionCharacter';
import { EmotionType } from '../../types';

interface StageBalloonBreathingProps {
  onBack: () => void;
  onEarnStar: (sticker: string, note: string) => void;
}

type Phase = 'pick_emotion' | 'tutorial' | 'calibrating' | 'blowing' | 'flying' | 'completed';

interface EmotionOption {
  type: EmotionType;
  label: string;
  emoji: string;
  color: string;
  balloonBg: string;
  strokeColor: string;
}

const EMOTION_OPTIONS: EmotionOption[] = [
  {
    type: 'sad',
    label: 'حزين',
    emoji: '😢',
    color: 'from-sky-400 to-blue-500',
    balloonBg: '#38bdf8',
    strokeColor: '#0284c7',
  },
  {
    type: 'angry',
    label: 'غاضب',
    emoji: '😠',
    color: 'from-rose-400 to-red-500',
    balloonBg: '#fb7185',
    strokeColor: '#e11d48',
  },
  {
    type: 'afraid',
    label: 'خائف',
    emoji: '😨',
    color: 'from-purple-400 to-violet-500',
    balloonBg: '#c084fc',
    strokeColor: '#7c3aed',
  },
];

type SensitivityLevel = 'easy' | 'medium' | 'strict';

export const StageBalloonBreathing: React.FC<StageBalloonBreathingProps> = ({
  onBack,
  onEarnStar,
}) => {
  const companion = Storage.getCompanionProfile();
  const companionDef = COMPANIONS_DATA[companion.type] || COMPANIONS_DATA.lion;

  const [phase, setPhase] = useState<Phase>('pick_emotion');
  const [balloonIndex, setBalloonIndex] = useState(0); // 0, 1, 2 (3 بالونات)
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionOption>(EMOTION_OPTIONS[0]);
  const [inputMode, setInputMode] = useState<'mic' | 'touch'>('mic');
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('easy');
  const [showSettings, setShowSettings] = useState(false);

  const [inflationProgress, setInflationProgress] = useState(15); 
  const [isBlowingNow, setIsBlowingNow] = useState(false);
  const [isTouchingNow, setIsTouchingNow] = useState(false);
  const [audioLevelVisual, setAudioLevelVisual] = useState(0); 

  const [luluMood, setLuluMood] = useState<LuluMood>('idle');

  const [currentPrompt, setCurrentPrompt] = useState<string>(
    formatDialogue(DIALOGUES.balloonBreathing.question, companion.name, companionDef.title)
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const baselineNoiseRef = useRef<number>(20); 
  const lastBlowTimestampRef = useRef<number>(0);
  const lastSoundTickRef = useRef<number>(0);
  
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopMicrophone = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {}
      audioContextRef.current = null;
    }
    setIsBlowingNow(false);
    setAudioLevelVisual(0);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (phase === 'blowing') {
        setLuluMood('talking');
        const hintText = DIALOGUES.balloonBreathing.idleHint;
        setCurrentPrompt(hintText);
        sound.speak(hintText);
        sound.playBreatheTone('exhale');
        setTimeout(() => setLuluMood('idle'), 3500);
      }
    }, 10000);
  }, [phase]);

  useEffect(() => {
    const text = formatDialogue(DIALOGUES.balloonBreathing.intro, companion.name, companionDef.title);
    setCurrentPrompt(text);
    sound.speak(text);

    return () => {
      stopMicrophone();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [companion.name, companionDef.title, stopMicrophone]);

  const startAudioAnalysis = useCallback((analyser: AnalyserNode, sampleRate: number) => {
    const bufferLength = analyser.frequencyBinCount; 
    const dataArray = new Uint8Array(bufferLength);
    const binSize = sampleRate / analyser.fftSize; 

    const lowFreqMaxBin = Math.max(2, Math.floor(300 / binSize)); 
    const midHighFreqMinBin = Math.floor(400 / binSize); 
    const midHighFreqMaxBin = Math.min(bufferLength - 1, Math.floor(3500 / binSize));

    let smoothedLowEnergy = 0;
    let smoothedRatio = 0;

    const analyze = () => {
      if (!analyserRef.current) return;

      analyser.getByteFrequencyData(dataArray);

      let lowSum = 0;
      for (let i = 1; i <= lowFreqMaxBin; i++) {
        lowSum += dataArray[i];
      }
      const avgLow = lowSum / lowFreqMaxBin;

      let midHighSum = 0;
      let count = 0;
      for (let i = midHighFreqMinBin; i <= midHighFreqMaxBin; i += 2) {
        midHighSum += dataArray[i];
        count++;
      }
      const avgMidHigh = count > 0 ? midHighSum / count : 0;

      smoothedLowEnergy = smoothedLowEnergy * 0.75 + avgLow * 0.25;
      const ratio = avgLow / (avgMidHigh + 1);
      smoothedRatio = smoothedRatio * 0.75 + ratio * 0.25;

      const baseline = baselineNoiseRef.current;
      const thresholdMargin = sensitivity === 'easy' ? 8 : sensitivity === 'medium' ? 16 : 24;
      const requiredThreshold = baseline + thresholdMargin;

      const hasWindEnergy = smoothedLowEnergy > requiredThreshold;
      const isTurbulentWindNotSpeech = smoothedRatio > 1.25 && avgMidHigh < 95;

      const isBlowing = hasWindEnergy && isTurbulentWindNotSpeech;

      const visualPulse = Math.min(1, Math.max(0, (smoothedLowEnergy - baseline) / 60));
      setAudioLevelVisual(visualPulse);

      const now = performance.now();

      if (isBlowing) {
        lastBlowTimestampRef.current = now;
        setIsBlowingNow(true);
        resetIdleTimer();

        setInflationProgress(prev => {
          const next = Math.min(100, prev + 0.23);
          return next;
        });

        if (now - lastSoundTickRef.current > 380) {
          lastSoundTickRef.current = now;
          sound.playBalloonInflateTick();
          haptics.inflateTick(); 
        }
      } else {
        const timeSinceBlow = now - lastBlowTimestampRef.current;
        if (timeSinceBlow > 300) {
          setIsBlowingNow(false);
          setInflationProgress(prev => {
            if (prev <= 15) return 15;
            return Math.max(15, prev - 0.08); 
          });
        }
      }
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, [resetIdleTimer, sensitivity]);

  const initMicrophoneAndCalibrate = async () => {
    try {
      setPhase('calibrating');
      const calibPrompt = DIALOGUES.balloonBreathing.calibrationText;
      setCurrentPrompt(calibPrompt);
      sound.speak(calibPrompt);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      mediaStreamRef.current = stream;
      setMicPermissionGranted(true);

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let noiseSamples: number[] = [];

      const calibStartTime = Date.now();
      const calibInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let lowSum = 0;
        const lowBins = 14;
        for (let i = 1; i <= lowBins; i++) lowSum += dataArray[i];
        noiseSamples.push(lowSum / lowBins);

        if (Date.now() - calibStartTime >= 1100) {
          clearInterval(calibInterval);
          const avgBaseline = noiseSamples.reduce((a, b) => a + b, 0) / (noiseSamples.length || 1);
          baselineNoiseRef.current = Math.max(10, avgBaseline);
          
          setPhase('blowing');
          setInflationProgress(15);
          const blowPrompt = DIALOGUES.balloonBreathing.blowInstruction;
          setCurrentPrompt(blowPrompt);
          sound.speak(blowPrompt);
          startAudioAnalysis(analyser, ctx.sampleRate);
          resetIdleTimer();
        }
      }, 50);

    } catch {
      setMicPermissionGranted(false);
      setInputMode('touch');
      setPhase('blowing');
      const touchPrompt = DIALOGUES.balloonBreathing.touchInstruction;
      setCurrentPrompt(touchPrompt);
      sound.speak(touchPrompt);
    }
  };

  useEffect(() => {
    if (inputMode !== 'touch' || phase !== 'blowing') return;
    let touchInterval: number | null = null;
    
    if (isTouchingNow) {
      resetIdleTimer();
      touchInterval = window.setInterval(() => {
        setInflationProgress(prev => Math.min(100, prev + 0.45));
        sound.playBalloonInflateTick();
        haptics.inflateTick(); 
      }, 100); 
    } else {
      touchInterval = window.setInterval(() => {
        setInflationProgress(prev => {
          if (prev <= 15) return 15;
          return Math.max(15, prev - 0.2);
        });
      }, 50);
    }
    
    return () => {
      if (touchInterval) clearInterval(touchInterval);
    };
  }, [inputMode, isTouchingNow, phase, resetIdleTimer]);

  useEffect(() => {
    if (phase === 'blowing' && inflationProgress >= 99.5) {
      stopMicrophone();
      setPhase('flying');
      sound.playBalloonFlyAway();
      haptics.success(); 
      
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.5 },
      });

      const praise = DIALOGUES.balloonBreathing.balloonFlown;
      setCurrentPrompt(praise);
      sound.speak(praise);

      setTimeout(() => {
        if (balloonIndex >= 2) {
          setPhase('completed');
          setLuluMood('hugging');
          sound.playWarmHug();
          const finalPrompt = DIALOGUES.balloonBreathing.finalHug;
          setCurrentPrompt(finalPrompt);
          sound.speak(finalPrompt);
          onEarnStar('🎈', `تنفس ببطء مع ${companion.name}`);
        } else {
          setBalloonIndex(prev => prev + 1);
          setPhase('pick_emotion');
          setInflationProgress(15);
          const nextPrompt = `البالون رقم ${balloonIndex + 2}: اختر شعوراً آخر لنطيره!`;
          setCurrentPrompt(nextPrompt);
          sound.speak('اختر شعوراً آخر لنطيره!');
        }
      }, 3500);
    }
  }, [inflationProgress, phase, stopMicrophone, balloonIndex, companion.name, onEarnStar]);

  const handleSelectEmotion = (option: EmotionOption) => {
    sound.playTap();
    haptics.tap();
    setSelectedEmotion(option);
    setPhase('tutorial');
    const introText = `${option.label}؟ لا بأس. سنضعه داخل هذا البالون.`;
    setCurrentPrompt(introText);
    sound.speak(introText);
  };

  const handleStartBlowing = () => {
    sound.playTap();
    haptics.tap();
    if (inputMode === 'mic') {
      initMicrophoneAndCalibrate();
    } else {
      setPhase('blowing');
      const touchPrompt = DIALOGUES.balloonBreathing.touchInstruction;
      setCurrentPrompt(touchPrompt);
      sound.speak(touchPrompt);
    }
  };

  const handleRestart = () => {
    sound.playTap();
    haptics.tap();
    stopMicrophone();
    setBalloonIndex(0);
    setPhase('pick_emotion');
    setInflationProgress(15);
    setLuluMood('idle');
    const text = formatDialogue(DIALOGUES.balloonBreathing.question, companion.name, companionDef.title);
    setCurrentPrompt(text);
    sound.speak(text);
  };

  const currentBalloonSize = Math.max(60, inflationProgress * 2.8);
  const isWobbling = isBlowingNow || isTouchingNow;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 md:p-6 bg-gradient-to-b from-sky-100 via-amber-50 to-pink-100 overflow-x-hidden select-none">
      
      <div className="flex items-center justify-between z-10">
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
          <button
            onClick={() => {
              sound.playTap();
              haptics.tap();
              setShowSettings(true);
            }}
            className="w-11 h-11 rounded-full bg-white/90 border-2 border-slate-300 text-slate-700 flex items-center justify-center shadow cursor-pointer touch-manipulation"
          >
            <Sliders className="w-5 h-5" />
          </button>
          <SpeechSpeakerButton textToSpeak={currentPrompt} size="md" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-2 relative">
        <motion.div
          key={currentPrompt}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 border-3 border-sky-300 rounded-3xl p-4 md:p-5 shadow-lg text-center max-w-lg w-full mb-3 flex items-center gap-3 z-20"
        >
          <span className="text-3xl md:text-4xl shrink-0 filter drop-shadow">
            {phase === 'pick_emotion' ? '🤔' : phase === 'flying' ? '✨' : phase === 'completed' ? '💖' : '🎈'}
          </span>
          <p className="text-lg md:text-2xl font-black text-slate-800 leading-relaxed text-right flex-1">
            {currentPrompt}
          </p>
        </motion.div>

        {phase === 'pick_emotion' && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-md grid grid-cols-3 gap-3"
          >
            {EMOTION_OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => handleSelectEmotion(opt)}
                className={`h-28 md:h-32 rounded-3xl bg-gradient-to-b ${opt.color} text-white border-4 ${opt.strokeColor} shadow-lg flex flex-col items-center justify-center gap-2 touch-manipulation cursor-pointer active:scale-95 transition`}
              >
                <span className="text-4xl filter drop-shadow-md">{opt.emoji}</span>
                <span className="text-sm md:text-base font-black">{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}

        {phase === 'tutorial' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center mt-4"
          >
            <div className="w-32 h-40 bg-slate-200 rounded-full flex flex-col items-center justify-center border-4 border-slate-300 mb-6">
               <span className="text-5xl">{selectedEmotion.emoji}</span>
               <span className="mt-2 font-bold text-slate-600">سيذهب هنا</span>
            </div>
            <button
              onClick={handleStartBlowing}
              className="px-8 py-4 bg-sky-500 hover:bg-sky-600 text-white font-black text-xl md:text-2xl rounded-3xl shadow-xl flex items-center gap-3 border-4 border-sky-300 touch-manipulation cursor-pointer active:scale-95 transition"
            >
              <Wind className="w-8 h-8" />
              <span>أنا مستعد للنفخ!</span>
            </button>
          </motion.div>
        )}

        {(phase === 'calibrating' || phase === 'blowing' || phase === 'flying') && (
          <div className="relative flex flex-col items-center justify-center flex-1 w-full mt-4">
            
            <AnimatePresence>
              {phase === 'flying' && (
                <motion.div
                  initial={{ y: 0, scale: 1 }}
                  animate={{ y: -500, scale: 0.5, opacity: 0 }}
                  transition={{ duration: 3, ease: 'easeIn' }}
                  className="absolute z-20 flex flex-col items-center"
                >
                  <div
                    className="rounded-full shadow-2xl relative flex items-center justify-center"
                    style={{
                      width: 250,
                      height: 280,
                      backgroundColor: selectedEmotion.balloonBg,
                      border: `8px solid ${selectedEmotion.strokeColor}`,
                    }}
                  >
                     <span className="text-7xl filter drop-shadow-md opacity-50">{selectedEmotion.emoji}</span>
                  </div>
                  <div className="w-1.5 h-32 bg-white/80 mt-1" />
                </motion.div>
              )}
            </AnimatePresence>

            {phase !== 'flying' && (
              <motion.div
                animate={isWobbling ? { rotate: [-2, 2, -2] } : { rotate: 0 }}
                transition={{ duration: 0.3, repeat: Infinity }}
                className="relative z-20 flex flex-col items-center justify-end"
                style={{ height: 320 }}
              >
                <div
                  className="rounded-[45%] shadow-inner flex items-center justify-center transition-all duration-[50ms]"
                  style={{
                    width: currentBalloonSize,
                    height: currentBalloonSize * 1.1,
                    backgroundColor: selectedEmotion.balloonBg,
                    border: `${Math.max(2, inflationProgress / 10)}px solid ${selectedEmotion.strokeColor}`,
                  }}
                >
                  <span
                    className="filter drop-shadow-md opacity-60"
                    style={{ fontSize: Math.max(20, currentBalloonSize / 3) }}
                  >
                    {selectedEmotion.emoji}
                  </span>
                </div>
                <div className="w-1 bg-white/60 transition-all duration-[50ms]" style={{ height: Math.max(10, currentBalloonSize / 2) }} />
              </motion.div>
            )}

            {phase === 'blowing' && (
              <div className="mt-8 flex flex-col items-center z-30">
                {inputMode === 'mic' ? (
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-bold text-slate-500 mb-2">انفخ ببطء لتعبئة البالون</div>
                    <div className="w-64 h-6 bg-slate-200 rounded-full border-2 border-slate-300 overflow-hidden relative">
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 bg-sky-500 rounded-full"
                        style={{ width: `${inflationProgress}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-800 drop-shadow-sm">
                        {Math.round(inflationProgress)}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onPointerDown={() => setIsTouchingNow(true)}
                    onPointerUp={() => setIsTouchingNow(false)}
                    onPointerLeave={() => setIsTouchingNow(false)}
                    className={`w-48 h-48 rounded-full flex flex-col items-center justify-center gap-2 border-4 shadow-xl touch-none select-none transition-transform ${
                      isTouchingNow ? 'bg-sky-500 border-sky-300 scale-95' : 'bg-white border-sky-400'
                    }`}
                  >
                    <Hand className={`w-12 h-12 ${isTouchingNow ? 'text-white' : 'text-sky-500'}`} />
                    <span className={`text-xl font-black ${isTouchingNow ? 'text-white' : 'text-sky-700'}`}>
                      اضغط باستمرار!
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {phase === 'completed' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center mt-4"
          >
            <LuluCharacter mood={luluMood} size="hero" />
          </motion.div>
        )}
      </div>

      <div className="w-full max-w-md mx-auto z-10 min-h-[80px]">
        {phase === 'completed' && (
          <div className="flex gap-3 justify-center mt-4">
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
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm border-4 border-slate-300 shadow-2xl text-right"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-800">إعدادات النفخ</h3>
              <button onClick={() => setShowSettings(false)} className="p-1 bg-slate-100 rounded-full text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-700 mb-2">طريقة النفخ:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { sound.playTap(); haptics.tap(); setInputMode('mic'); }}
                    className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1 font-bold text-sm ${
                      inputMode === 'mic' ? 'bg-sky-100 border-sky-500 text-sky-800' : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                    الميكروفون الحقيقي
                  </button>
                  <button
                    onClick={() => { sound.playTap(); haptics.tap(); setInputMode('touch'); stopMicrophone(); }}
                    className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1 font-bold text-sm ${
                      inputMode === 'touch' ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <Hand className="w-5 h-5" />
                    الضغط باللمس
                  </button>
                </div>
              </div>

              {inputMode === 'mic' && (
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">حساسية الميكروفون:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { sound.playTap(); haptics.tap(); setSensitivity('easy'); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 ${
                        sensitivity === 'easy' ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      سهل جداً
                    </button>
                    <button
                      onClick={() => { sound.playTap(); haptics.tap(); setSensitivity('medium'); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 ${
                        sensitivity === 'medium' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      متوسط
                    </button>
                    <button
                      onClick={() => { sound.playTap(); haptics.tap(); setSensitivity('strict'); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 ${
                        sensitivity === 'strict' ? 'bg-rose-100 border-rose-500 text-rose-800' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      يحتاج نفخ قوي
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    إذا كان طفلك يواجه صعوبة في تعبئة البالون عبر الميكروفون، اختر "سهل جداً" أو غير وضع اللعب إلى "الضغط باللمس".
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-6 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm"
            >
              حفظ وإغلاق
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
