import React from 'react';
import { Lock, CheckCircle2, Brain, Sparkles } from 'lucide-react';
import type { StageId } from '../types';
import { sound } from '../utils/audio';
import { haptics } from '../utils/haptics';

type BrainGameId = 'decision_maze' | 'robot_programming' | 'pattern_secret';
interface Props { completedStages: StageId[]; onSelect: (game: BrainGameId) => void; }
const GAMES: { id: BrainGameId; title: string; emoji: string; desc: string; unlockAfter: StageId; unlockName: string; color: string }[] = [
  { id: 'decision_maze', title: 'متاهة القرارات', emoji: '🧭', desc: 'خطط طريقك وتجاوز الصخور للوصول إلى الكنز.', unlockAfter: 'plan_b', unlockName: 'غابة المطر', color: 'from-emerald-100 to-teal-200' },
  { id: 'robot_programming', title: 'برمج الروبوت', emoji: '🤖', desc: 'رتّب أوامر الحركة وساعد الروبوت على الوصول.', unlockAfter: 'rose_breathing', unlockName: 'قمة الرياح', color: 'from-sky-100 to-indigo-200' },
  { id: 'pattern_secret', title: 'سرّ الأنماط', emoji: '🧩', desc: 'اكتشف التسلسل واختر القطعة الناقصة.', unlockAfter: 'magic_words', unlockName: 'وادي الأزهار', color: 'from-amber-100 to-rose-200' },
];
export const BrainGamesHub: React.FC<Props> = ({ completedStages, onSelect }) => (
  <section className="w-full mb-5">
    <div className="flex items-center justify-between mb-3 px-1">
      <div><h3 className="text-lg font-black text-amber-950 flex items-center gap-2"><Brain className="w-5 h-5 text-indigo-600"/> ألعاب الذكاء الإضافية</h3><p className="text-xs font-bold text-amber-800 mt-1">تحديات تفتح بعد إكمال محطاتها الأساسية</p></div>
      <Sparkles className="w-6 h-6 text-amber-500"/>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {GAMES.map(game => {
        const unlocked = completedStages.includes(game.unlockAfter);
        const completed = completedStages.includes(game.id);
        return <button key={game.id} disabled={!unlocked} onClick={() => { sound.playTap(); haptics.tap(); onSelect(game.id); }} className={`relative text-right rounded-2xl border-2 p-3 shadow-sm transition ${unlocked ? `bg-gradient-to-br ${game.color} border-white hover:scale-[1.02] cursor-pointer` : 'bg-slate-100 border-slate-200 opacity-75 cursor-not-allowed'}`}>
          <div className="flex items-center justify-between"><span className="text-3xl">{game.emoji}</span>{completed ? <CheckCircle2 className="w-5 h-5 text-emerald-600"/> : !unlocked ? <Lock className="w-4 h-4 text-slate-500"/> : <Sparkles className="w-4 h-4 text-amber-600"/>}</div>
          <h4 className="font-black text-slate-900 mt-2">{game.title}</h4><p className="text-xs font-bold text-slate-700 mt-1 leading-relaxed">{game.desc}</p>
          <p className="text-[10px] font-black mt-2 text-indigo-800">{unlocked ? (completed ? 'أُنجزت — يمكنك إعادة اللعب' : 'مفتوحة الآن') : `تفتح بعد: ${game.unlockName}`}</p>
        </button>;
      })}
    </div>
  </section>
);
