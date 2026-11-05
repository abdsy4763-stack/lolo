import React,{useState} from 'react';
import {ArrowRight,RotateCcw,Sparkles} from 'lucide-react';
import confetti from 'canvas-confetti';
import {sound} from '../../utils/audio';
import {haptics} from '../../utils/haptics';
type BrainGameId='decision_maze'|'pattern_secret'|'balance_scale'|'spot_difference';
interface Props{game:BrainGameId;onBack:()=>void;onEarnStar:(sticker:string,note:string)=>void}
const MAZES=[{walls:['1,0','1,1','3,1','3,2'],hint:'ابدأ بالنزول ثم اتجه نحو الكنز.'},{walls:['0,1','1,1','2,1','3,3'],hint:'جرّب السير بمحاذاة الحافة العلوية.'},{walls:['1,0','1,1','1,2','3,2','3,3'],hint:'التف حول الجدار الطويل.'}];
const PATTERNS=[
 [{seq:['🔴','🔵','🔴','🔵'],choices:['🔴','🟢','⭐'],answer:'🔴'},{seq:['🐱','🐶','🐱','🐶'],choices:['🐱','🐰','🐶'],answer:'🐱'},{seq:['⭐','⭐','🌙','⭐','⭐'],choices:['🌙','⭐','☀️'],answer:'🌙'}],
 [{seq:['🔴','🔵','🟢','🔴','🔵'],choices:['🟢','🟡','🔴'],answer:'🟢'},{seq:['🐟','🐟','🐠','🐟','🐟'],choices:['🐟','🐠','🐬'],answer:'🐠'},{seq:['1️⃣','2️⃣','3️⃣','1️⃣','2️⃣'],choices:['1️⃣','3️⃣','4️⃣'],answer:'3️⃣'}],
 [{seq:['🔺','🔻','🔻','🔺','🔻','🔻'],choices:['🔺','🔻','🟦'],answer:'🔺'},{seq:['🌞','🌙','⭐','🌞','🌙'],choices:['🌙','⭐','🌞'],answer:'⭐'},{seq:['🟢','🟡','🟡','🟢','🟡','🟡'],choices:['🔴','🟡','🟢'],answer:'🟢'}]
];
const BALANCE=[
 [{left:'🍎 🍎',right:'🍌',answer:'left'},{left:'🍐',right:'🍒 🍒',answer:'right'},{left:'🍊 🍊 🍊',right:'🍇 🍇',answer:'left'}],
 [{left:'🍎 🍎 🍎',right:'🍌 🍌',answer:'left'},{left:'🍐 🍐',right:'🍒 🍒 🍒',answer:'right'},{left:'🍊 🍊',right:'🍇 🍇 🍇',answer:'right'}],
 [{left:'🍎 🍎 🍎 🍎',right:'🍌 🍌 🍌',answer:'left'},{left:'🍐 🍐 🍐',right:'🍒 🍒 🍒 🍒',answer:'right'},{left:'🍊 🍊 🍊 🍊',right:'🍇 🍇 🍇',answer:'left'}]
];
const DETECTIVE=[
 [{rows:3,base:'🍀',odd:'🌼',index:4},{rows:3,base:'🐟',odd:'🐠',index:7},{rows:3,base:'🔴',odd:'🟠',index:1}],
 [{rows:4,base:'🔵',odd:'🟣',index:10},{rows:4,base:'🌸',odd:'🌺',index:3},{rows:4,base:'🐱',odd:'🐯',index:13}],
 [{rows:5,base:'⭐',odd:'🌟',index:17},{rows:5,base:'🍎',odd:'🍒',index:6},{rows:5,base:'🟩',odd:'🟢',index:22}]
];
const INFO:Record<BrainGameId,{title:string;subtitle:string;emoji:string;gradient:string}>={
 decision_maze:{title:'متاهة القرارات',subtitle:'خطط للطريق وتجنب العوائق للوصول إلى الكنز',emoji:'🧭',gradient:'from-emerald-100 to-teal-200'},
 pattern_secret:{title:'سرّ الأنماط',subtitle:'اكتشف القاعدة واختر الشكل الذي يكمل التسلسل',emoji:'🧩',gradient:'from-amber-100 to-rose-200'},
 balance_scale:{title:'ميزان العباقرة',subtitle:'قارن الكفتين واختر الكفة الأثقل',emoji:'⚖️',gradient:'from-sky-100 to-cyan-200'},
 spot_difference:{title:'عين المحقق',subtitle:'ابحث عن الرمز المختلف بين الرموز المتشابهة',emoji:'🔎',gradient:'from-violet-100 to-fuchsia-200'}
};
export const StageBrainGames:React.FC<Props>=({game,onBack,onEarnStar})=>{
 const [level,setLevel]=useState(0),[position,setPosition]=useState({x:0,y:0}),[moves,setMoves]=useState(0),[round,setRound]=useState(0),[feedback,setFeedback]=useState('فكر جيداً، وكل محاولة تقربك من الحل!'),[finished,setFinished]=useState(false);
 const info=INFO[game],maze=MAZES[level],pattern=PATTERNS[level][round],balance=BALANCE[level][round],detective=DETECTIVE[level][round];
 const reset=()=>{setPosition({x:0,y:0});setMoves(0);setRound(0);setFinished(false);setFeedback('ابدأ تحدياً جديداً!')};
 const win=()=>{if(finished)return;setFinished(true);sound.playTada();haptics.success();confetti({particleCount:90,spread:75,origin:{y:.55}});const rewards:Record<BrainGameId,[string,string]>={decision_maze:['🧭','التخطيط واختيار المسار وحل المتاهات'],pattern_secret:['🧩','اكتشاف الأنماط والتفكير المنطقي'],balance_scale:['⚖️','المقارنة والاستنتاج وتقدير الكميات'],spot_difference:['🔎','الملاحظة البصرية والانتباه للتفاصيل']};onEarnStar(...rewards[game])};
 const advance=()=>{sound.playSuccessChime();haptics.success();if(round===2)win();else{setRound(v=>v+1);setFeedback('أحسنت! لننتقل إلى التحدي التالي.')}};
 const wrong=()=>{sound.playBubblePop();haptics.error();setFeedback('ليست الإجابة الصحيحة. ألقِ نظرة أخرى وحاول!')};
 const move=(dx:number,dy:number)=>{if(finished)return;const next={x:position.x+dx,y:position.y+dy};if(next.x<0||next.x>4||next.y<0||next.y>4||maze.walls.includes(`${next.x},${next.y}`)){wrong();setFeedback('هذا الطريق مغلق. جرّب اتجاهاً آخر!');return;}sound.playTap();haptics.tap();setPosition(next);setMoves(v=>v+1);if(next.x===4&&next.y===4)win()};
 return <div className={`min-h-screen w-full flex flex-col p-4 md:p-6 bg-gradient-to-b ${info.gradient} select-none`}>
 <header className="flex items-center justify-between gap-2 max-w-2xl w-full mx-auto"><button onClick={()=>{sound.playTap();onBack()}} className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/90 text-slate-800 font-black shadow border-2 border-white"><ArrowRight className="w-5 h-5"/> العودة للخريطة</button><div className="px-4 py-2 rounded-2xl bg-white/90 text-slate-800 font-black shadow text-sm">{info.emoji} {info.title}</div></header>
 <main className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto py-5"><div className="text-center mb-4"><div className="text-6xl mb-2">{info.emoji}</div><h1 className="text-2xl md:text-3xl font-black text-slate-900">{info.title}</h1><p className="text-sm font-bold text-slate-700 mt-2">{info.subtitle}</p><div className="flex justify-center gap-2 mt-4">{['سهل','متوسط','متقدم'].map((name,i)=><button key={name} onClick={()=>{setLevel(i);reset()}} className={`px-4 py-2 rounded-xl font-black text-sm border-2 ${level===i?'bg-indigo-600 text-white border-indigo-700':'bg-white/80 text-slate-700 border-white'}`}>{name}</button>)}</div></div>
 <div className="w-full bg-white/90 rounded-3xl p-4 md:p-6 shadow-xl border-2 border-white">
 {game==='decision_maze'&&<><p className="text-center font-black text-slate-800 mb-3">حرّك لؤلؤ من 🏁 إلى 💎 وتجنب الصخور</p><div className="grid grid-cols-5 gap-1 max-w-xs mx-auto">{Array.from({length:25},(_,i)=>{const x=i%5,y=Math.floor(i/5),wall=maze.walls.includes(`${x},${y}`),here=position.x===x&&position.y===y;return <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-2xl border ${wall?'bg-stone-500 border-stone-600':here?'bg-emerald-200 border-emerald-500':x===4&&y===4?'bg-amber-200 border-amber-400':'bg-sky-50 border-sky-100'}`}>{wall?'🪨':here?'🦁':x===4&&y===4?'💎':''}</div>})}</div><div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto mt-4"><span/><button onClick={()=>move(0,-1)} className="p-3 rounded-xl bg-indigo-100 text-2xl">⬆️</button><span/><button onClick={()=>move(-1,0)} className="p-3 rounded-xl bg-indigo-100 text-2xl">⬅️</button><button onClick={()=>move(0,1)} className="p-3 rounded-xl bg-indigo-100 text-2xl">⬇️</button><button onClick={()=>move(1,0)} className="p-3 rounded-xl bg-indigo-100 text-2xl">➡️</button></div><p className="text-center text-xs font-bold text-slate-500 mt-2">عدد الخطوات: {moves} · {maze.hint}</p></>}
 {game==='pattern_secret'&&<><p className="text-center font-black text-slate-800 mb-4">ما العنصر الذي يأتي بعد ذلك؟ (لغز {round+1} من 3)</p><div className="flex flex-wrap items-center justify-center gap-2 text-4xl bg-amber-50 rounded-2xl p-5 mb-5">{pattern.seq.map((v,i)=><span key={i}>{v}</span>)}<span className="text-indigo-600">❓</span></div><div className="grid grid-cols-3 gap-3">{pattern.choices.map(v=><button key={v} onClick={()=>v===pattern.answer?advance():wrong()} className="py-5 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-4xl">{v}</button>)}</div></>}
 {game==='balance_scale'&&<><p className="text-center font-black text-slate-800 mb-4">أي الكفتين أثقل؟ قارن عدد الثمار.</p><div className="grid grid-cols-2 gap-3"><button onClick={()=>balance.answer==='left'?advance():wrong()} className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 min-h-32"><div className="text-3xl mb-2">⚖️</div><div className="text-2xl">{balance.left}</div><div className="font-black mt-2">الكفة اليسرى</div></button><button onClick={()=>balance.answer==='right'?advance():wrong()} className="rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-4 min-h-32"><div className="text-3xl mb-2">⚖️</div><div className="text-2xl">{balance.right}</div><div className="font-black mt-2">الكفة اليمنى</div></button></div><p className="text-center text-xs text-slate-500 font-bold mt-3">التحدي {round+1} من 3</p></>}
 {game==='spot_difference'&&<><p className="text-center font-black text-slate-800 mb-4">اضغط على الرمز المختلف!</p><div className="grid gap-2 max-w-xs mx-auto" style={{gridTemplateColumns:`repeat(${detective.rows},minmax(0,1fr))`}}>{Array.from({length:detective.rows*detective.rows},(_,i)=><button key={i} onClick={()=>i===detective.index?advance():wrong()} className="aspect-square rounded-xl bg-violet-50 border-2 border-violet-100 text-3xl">{i===detective.index?detective.odd:detective.base}</button>)}</div><p className="text-center text-xs text-slate-500 font-bold mt-3">شبكة {detective.rows} × {detective.rows} · الجولة {round+1} من 3</p></>}
 <p className="mt-4 text-center text-sm font-black text-indigo-800" aria-live="polite">{feedback}</p>
 {finished&&<div className="mt-5 text-center"><div className="text-5xl mb-2">🏆</div><p className="font-black text-emerald-700">أحسنت! حصلت على نجمة الذكاء.</p><div className="flex gap-2 mt-3"><button onClick={reset} className="flex-1 py-3 rounded-xl bg-slate-100 font-black"><RotateCcw className="inline w-4 h-4"/> إعادة اللعب</button><button onClick={()=>{setLevel(v=>(v+1)%3);reset()}} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black"><Sparkles className="inline w-4 h-4"/> مستوى آخر</button></div></div>}
 </div></main></div>;
};
