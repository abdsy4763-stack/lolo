import React, { useEffect } from 'react';
import { Moon, Star, Lock } from 'lucide-react';
import { LuluCharacter } from './LuluCharacter';
import { sound } from '../utils/audio';
import { DIALOGUES } from '../data/dialogue';

interface SleepScreenProps {
  onParentUnlock: () => void;
}

export const SleepScreen: React.FC<SleepScreenProps> = ({ onParentUnlock }) => {
  useEffect(() => {
    sound.speak(DIALOGUES.sleepTime.body);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-b from-indigo-950 via-slate-900 to-amber-950/80 flex flex-col items-center justify-center p-6 text-center select-none text-white">
      {/* نجوم الليل الساكنة */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Star className="absolute top-12 left-10 w-6 h-6 text-yellow-300 animate-pulse" />
        <Star className="absolute top-24 right-16 w-4 h-4 text-yellow-200 animate-pulse" />
        <Star className="absolute top-44 left-1/4 w-5 h-5 text-yellow-300 animate-pulse" />
        <Star className="absolute bottom-32 right-12 w-6 h-6 text-yellow-100 animate-pulse" />
        <Moon className="absolute top-10 right-10 w-16 h-16 text-amber-200 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
      </div>

      {/* الأسد لؤلؤ نائم بسلام */}
      <div className="relative z-10 mb-6">
        <LuluCharacter mood="sleeping" size="hero" />
      </div>

      <div className="relative z-10 max-w-sm space-y-3">
        <h2 className="text-3xl font-black text-amber-300">
          {DIALOGUES.sleepTime.title}
        </h2>
        <p className="text-lg text-amber-100 font-bold leading-relaxed">
          {DIALOGUES.sleepTime.body}
        </p>
      </div>

      {/* زر الأهل للتخطي */}
      <div className="mt-10 relative z-10">
        <button
          onClick={onParentUnlock}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-amber-200 border border-amber-300/30 transition backdrop-blur-xs"
        >
          <Lock className="w-4 h-4" />
          <span>{DIALOGUES.sleepTime.parentBypass}</span>
        </button>
      </div>
    </div>
  );
};
