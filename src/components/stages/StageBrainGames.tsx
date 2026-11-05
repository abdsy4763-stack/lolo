import React, { useMemo, useState } from 'react';
import { ArrowRight, RotateCcw, Play, Trash2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import type { StageId } from '../../types';

type BrainGameId = 'decision_maze' | 'robot_programming' | 'pattern_secret';
interface Props { game: BrainGameId; onBack: () => void; onEarnStar: (sticker: string, note: string) => void; }
type Direction = 'up' | 'down' | 'left' | 'right';
const DIRS: { id: Direction; label: string; icon: string; dx: number; dy: number }[] = [
  { id: 'up', label: 'أعلى', icon: '⬆️', dx: 0, dy: -1 },
  { id: 'down', label: 'أسفل', icon: '⬇️', dx: 0, dy: 1 },
  { id: 'left', label: 'يسار', icon: '⬅️', dx: -1, dy: 0 },
  { id: 'right', label: 'يمين', icon: '➡️', dx: 1, dy: 0 },
];
const MAZES = [
  { walls: ['1,0','1,1','3,1','3,2'], hint: 'ابدأ بالنزول ثم اتجه نحو الكنز.' },
  { walls: ['0,1','1,1','2,1','3,3'], hint: 'جرّب السير بمحاذاة الحافة العلوية.' },
  { walls: ['1,0','1,1','1,2','3,2','3,3'], hint: 'قد تحتاج إلى الالتفاف حول الجدار الطويل.' },
];
const PATTERNS = [
  [
    { seq: ['🔴','🔵','🔴','🔵'], choices: ['🔴','🟢','⭐'], answer: '🔴' },
    { seq: ['🐱','🐶','🐱','🐶'], choices: ['🐱','🐰','🐶'], answer: '🐱' },
    { seq: ['⭐','⭐','🌙','⭐','⭐'], choices: ['🌙','⭐','☀️'], answer: '🌙' },
  ],
  [
    { seq: ['🔴','🔵','🟢','🔴','🔵'], choices: ['🟢','🟡','🔴'], answer: '🟢' },
    { seq: ['🐟','🐟','🐠','🐟','🐟'], choices: ['🐟','🐠','🐬'], answer: '🐠' },
    { seq: ['1️⃣','2️⃣','3️⃣','1️⃣','2️⃣'], choices: ['1️⃣','3️⃣','4️⃣'], answer: '3️⃣' },
  ],
  [
    { seq: ['🔺','🔻','🔻','🔺','🔻','🔻'], choices: ['🔺','🔻','🟦'], answer: '🔺' },
    { seq: ['🌞','🌙','⭐','🌞','🌙'], choices: ['🌙','⭐','🌞'], answer: '⭐' },
    { seq: ['🟢','🟡','🟡','🟢','🟡','🟡'], choices: ['🔴','🟡','🟢'], answer: '🟢' },
  ],
];
const GAME_INFO: Record<BrainGameId, { title: string; subtitle: string; emoji: string; gradient: string }> = {
  decision_maze: { title: 'متاهة القرارات', subtitle: 'خطط للطريق وتجنب العوائق للوصول إلى الكنز', emoji: '🧭', gradient: 'from-emerald-100 to-teal-200' },
  robot_programming: { title: 'برمج الروبوت', subtitle: 'رتّب أوامر الحركة واجعل الروبوت يصل إلى الهدف', emoji: '🤖', gradient: 'from-sky-100 to-indigo-200' },
  pattern_secret: { title: 'سرّ الأنماط', subtitle: 'اكتشف القاعدة واختر الشكل الذي يكمل التسلسل', emoji: '🧩', gradient: 'from-amber-100 to-rose-200' },
};

export const StageBrainGames: React.FC<Props> = ({ game, onBack, onEarnStar }) => {
  const info = GAME_INFO[game];
  const [level, setLevel] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [moves, setMoves] = useState(0);
  const [program, setProgram] = useState<Direction[]>([]);
  const [feedback, setFeedback] = useState('اختر خطواتك بهدوء، فكل محاولة تعلمك شيئاً جديداً.');
  const [patternRound, setPatternRound] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const maze = MAZES[level];
  const pattern = PATTERNS[level][patternRound];

  const reset = () => {
    setPosition({ x: 0, y: 0 }); setMoves(0); setProgram([]);
    setPatternRound(0); setFinished(false); setWrongCount(0);
    setFeedback('حاول من جديد! يمكنك التفكير بخطوات مختلفة.');
  };
  const win = () => {
    if (finished) return;
    setFinished(true); sound.playTada(); haptics.success();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 } });
    const notes: Record<BrainGameId, string> = {
      decision_maze: 'التخطيط واختيار المسار وحل المتاهات',
      robot_programming: 'ترتيب الأوامر والتفكير الخوارزمي',
      pattern_secret: 'اكتشاف الأنماط والتفكير المنطقي',
    };
    onEarnStar(game === 'decision_maze' ? '🧭' : game === 'robot_programming' ? '🤖' : '🧩', notes[game]);
  };
  const move = (dir: Direction) => {
    if (finished) return;
    const d = DIRS.find(item => item.id === dir)!;
    const next = { x: position.x + d.dx, y: position.y + d.dy };
    if (next.x < 0 || next.x > 4 || next.y < 0 || next.y > 4 || (game === 'decision_maze' && maze.walls.includes(`${next.x},${next.y}`))) {
      sound.playBubblePop(); setFeedback('هذا الطريق مغلق. جرّب اتجاهاً آخر!'); return;
    }
    sound.playTap(); haptics.tap(); setPosition(next); setMoves(v => v + 1);
    if (next.x === 4 && next.y === 4) win();
  };
  const runProgram = () => {
    if (!program.length || finished) return;
    let p = { x: 0, y: 0 };
    for (const command of program) {
      const d = DIRS.find(item => item.id === command)!;
      p = { x: p.x + d.dx, y: p.y + d.dy };
      if (p.x < 0 || p.x > 4 || p.y < 0 || p.y > 4) {
        setFeedback('وصل الروبوت إلى حافة الطريق! عدّل الأوامر ثم حاول مجدداً.'); return;
      }
    }
    setPosition(p); setMoves(program.length);
    if (p.x === 4 && p.y === 4) win();
    else setFeedback('وصل الروبوت إلى مكان آخر. غيّر ترتيب الأوامر ليصل إلى النجمة!');
  };
  const choosePattern = (choice: string) => {
    if (finished) return;
    if (choice !== pattern.answer) {
      sound.playBubblePop(); haptics.error(); setWrongCount(v => v + 1);
      setFeedback('ليست هذه الإجابة. انظر إلى التسلسل مرة أخرى وابحث عن القاعدة.');
      return;
    }
    sound.playSuccessChime(); haptics.success();
    if (patternRound === 2) win();
    else { setPatternRound(v => v + 1); setFeedback('أحسنت! اكتشفت القاعدة. هيا إلى اللغز التالي.'); }
  };
  const goNextLevel = () => { setLevel(v => (v + 1) % 3); reset(); };
  const commands = useMemo(() => program.map(id => DIRS.find(d => d.id === id)?.icon), [program]);

  return (
    <div className={`min-h-screen w-full flex flex-col p-4 md:p-6 bg-gradient-to-b ${info.gradient} select-none`}>
      <header className="flex items-center justify-between gap-2 max-w-2xl w-full mx-auto">
        <button onClick={() => { sound.playTap(); onBack(); }} className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/90 text-slate-800 font-black shadow border-2 border-white"><ArrowRight className="w-5 h-5"/> العودة للخريطة</button>
        <div className="px-4 py-2 rounded-2xl bg-white/90 text-slate-800 font-black shadow text-sm">{info.emoji} {info.title}</div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto py-5">
        <div className="text-center mb-4">
          <div className="text-6xl mb-2">{info.emoji}</div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">{info.title}</h1>
          <p className="text-sm font-bold text-slate-700 mt-2">{info.subtitle}</p>
          <div className="flex justify-center gap-2 mt-4">
            {['سهل','متوسط','متقدم'].map((name, index) => <button key={name} onClick={() => { setLevel(index); reset(); }} className={`px-4 py-2 rounded-xl font-black text-sm border-2 ${level === index ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white/80 text-slate-700 border-white'}`}>{name}</button>)}
          </div>
        </div>
        <div className="w-full bg-white/90 rounded-3xl p-4 md:p-6 shadow-xl border-2 border-white">
          {game === 'decision_maze' && <>
            <p className="text-center font-black text-slate-800 mb-3">حرّك لؤلؤ من 🏁 إلى 💎 وتجنب المربعات الصخرية</p>
            <div className="grid grid-cols-5 gap-1 max-w-xs mx-auto">
              {Array.from({ length: 25 }, (_, i) => {
                const x = i % 5, y = Math.floor(i / 5), wall = maze.walls.includes(`${x},${y}`), here = position.x === x && position.y === y;
                return <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-2xl border ${wall ? 'bg-stone-500 border-stone-600' : here ? 'bg-emerald-200 border-emerald-500' : x === 4 && y === 4 ? 'bg-amber-200 border-amber-400' : 'bg-sky-50 border-sky-100'}`}>{wall ? '🪨' : here ? '🦁' : x === 4 && y === 4 ? '💎' : ''}</div>;
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto mt-4">
              <span/><button onClick={() => move('up')} className="p-3 rounded-xl bg-indigo-100 text-2xl">⬆️</button><span/>
              <button onClick={() => move('left')} className="p-3 rounded-xl bg-indigo-100 text-2xl">⬅️</button><button onClick={() => move('down')} className="p-3 rounded-xl bg-indigo-100 text-2xl">⬇️</button><button onClick={() => move('right')} className="p-3 rounded-xl bg-indigo-100 text-2xl">➡️</button>
            </div>
            <p className="text-center text-xs font-bold text-slate-500 mt-2">عدد الخطوات: {moves} · {maze.hint}</p>
          </>}
          {game === 'robot_programming' && <>
            <p className="text-center font-black text-slate-800 mb-3">أضف الأوامر بالترتيب ثم اضغط تشغيل</p>
            <div className="grid grid-cols-5 gap-1 max-w-xs mx-auto mb-4">
              {Array.from({ length: 25 }, (_, i) => { const x=i%5, y=Math.floor(i/5); return <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-2xl border ${position.x===x&&position.y===y?'bg-sky-200 border-sky-500':'bg-slate-50 border-slate-200'}`}>{position.x===x&&position.y===y?'🤖':x===4&&y===4?'⭐':''}</div>; })}
            </div>
            <div className="min-h-14 p-3 rounded-xl bg-slate-100 text-center text-2xl mb-3">{commands.length ? commands.join(' ') : 'أوامرك ستظهر هنا'}</div>
            <div className="grid grid-cols-4 gap-2">{DIRS.map(d => <button key={d.id} onClick={() => { if(program.length<12){setProgram(p=>[...p,d.id]);sound.playTap();} }} className="p-3 rounded-xl bg-indigo-100 font-black"><span className="text-2xl block">{d.icon}</span><span className="text-xs">{d.label}</span></button>)}</div>
            <div className="flex gap-2 mt-3"><button onClick={runProgram} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center gap-2"><Play className="w-4 h-4"/> تشغيل الأوامر</button><button onClick={() => {setProgram([]);setPosition({x:0,y:0});setFeedback('تم مسح الأوامر. ابدأ من جديد.');}} className="px-4 rounded-xl bg-rose-100 text-rose-700"><Trash2 className="w-5 h-5"/></button></div>
            <p className="text-center text-xs font-bold text-slate-500 mt-2">عدد الأوامر: {program.length} / 12</p>
          </>}
          {game === 'pattern_secret' && <>
            <p className="text-center font-black text-slate-800 mb-4">ما العنصر الذي يجب أن يأتي بعد ذلك؟ (لغز {patternRound + 1} من 3)</p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-4xl bg-amber-50 rounded-2xl p-5 mb-5">{pattern.seq.map((item, i) => <span key={i}>{item}</span>)}<span className="text-indigo-600">❓</span></div>
            <div className="grid grid-cols-3 gap-3">{pattern.choices.map(choice => <button key={choice} onClick={() => choosePattern(choice)} className="py-5 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-4xl hover:bg-indigo-100">{choice}</button>)}</div>
          </>}
          <p className="mt-4 text-center text-sm font-black text-indigo-800" aria-live="polite">{feedback}</p>
          {finished && <div className="mt-5 text-center"><div className="text-5xl mb-2">🏆</div><p className="font-black text-emerald-700">أحسنت! حصلت على نجمة الذكاء.</p><div className="flex gap-2 mt-3"><button onClick={reset} className="flex-1 py-3 rounded-xl bg-slate-100 font-black"><RotateCcw className="inline w-4 h-4"/> إعادة اللعب</button><button onClick={goNextLevel} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black"><Sparkles className="inline w-4 h-4"/> مستوى آخر</button></div></div>}
        </div>
      </main>
    </div>
  );
};
