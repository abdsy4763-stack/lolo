import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { sound } from '../../utils/audio';
import { haptics } from '../../utils/haptics';
import { Storage } from '../../utils/storage';
import { COMPANIONS_DATA } from '../CompanionCharacter';

interface StageMemoryGameProps {
  onBack: () => void;
  onEarnStar?: (sticker: string, note: string) => void;
}

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const DIFFICULTY_PAIRS = {
  easy: ['🦁', '🐰', '🐼', '🦊'],
  normal: ['🦁', '🐰', '🐼', '🦊', '🌟', '💖'],
  hard: ['🦁', '🐰', '🐼', '🦊', '🌟', '💖', '🍀', '🌈'],
} as const;
type Difficulty = keyof typeof DIFFICULTY_PAIRS;

export const StageMemoryGame: React.FC<StageMemoryGameProps> = ({ onBack, onEarnStar }) => {
  const companion = Storage.getCompanionProfile();
  const companionDef = COMPANIONS_DATA[companion.type];

  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  useEffect(() => {
    sound.speak(`لعبة الذاكرة! ابحث عن الأشكال المتطابقة يا ${companion.name}.`);
    startNewGame('normal');
  }, [companion.name]);

  const startNewGame = (level: Difficulty = difficulty) => {
    sound.playTap();
    const pairs = DIFFICULTY_PAIRS[level];
    const shuffledCards = [...pairs, ...pairs]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledCards);
    setFlippedIndices([]);
    setMatches(0);
    setMoves(0);
    setIsFinished(false);
  };

  const handleCardClick = (index: number) => {
    if (cards[index].isFlipped || cards[index].isMatched || flippedIndices.length === 2) return;

    sound.playBubblePop();
    haptics.tap();

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      
      if (newCards[first].emoji === newCards[second].emoji) {
        // تطابق!
        setTimeout(() => {
          sound.playSuccessChime();
          haptics.pop();
          const matchedCards = [...newCards];
          matchedCards[first].isMatched = true;
          matchedCards[second].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          setMatches(m => {
            const newMatches = m + 1;
            if (newMatches === cards.length / 2) handleWin();
            return newMatches;
          });
        }, 500);
      } else {
        // خطأ
        setTimeout(() => {
          haptics.error();
          const resetCards = [...newCards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  const handleWin = () => {
    const reward = difficulty === 'easy' ? 10 : difficulty === 'hard' ? 30 : 20;
    setIsFinished(true);
    sound.playTada();
    haptics.success();
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });

    // مكافأة الطفل 20 عملة
    const currentCoins = companion.coins || 0;
    Storage.saveCompanionProfile({ coins: currentCoins + reward });
    
    sound.speak(`عمل رائع! ذاكرتك قوية جداً. لقد حصلت على ${reward} عملة ذهبية!`);
    Storage.addLog({ type: 'game_played', stageId: 'memory_game', label: 'لعب الذاكرة', detail: `أكملها في ${moves} محاولات` });
    if (onEarnStar) {
      setTimeout(() => {
        onEarnStar('🃏', 'قوة التركيز والذاكرة الفولاذية');
      }, 1500);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col p-4 md:p-6 bg-gradient-to-b from-indigo-100 via-purple-50 to-pink-100 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between z-20 mb-6">
        <button onClick={() => { sound.playTap(); haptics.tap(); onBack(); }} className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/90 hover:bg-white text-indigo-950 font-black shadow-md border-2 border-indigo-300">
          <ArrowRight className="w-5 h-5" /> <span>العودة</span>
        </button>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-white/90 rounded-full border-2 border-indigo-300 text-indigo-900 font-black shadow">
            محاولات: {moves}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4 z-20">
        <span className="text-indigo-900 font-black text-sm">المستوى:</span>
        {(['easy', 'normal', 'hard'] as Difficulty[]).map(level => (
          <button key={level} onClick={() => { setDifficulty(level); startNewGame(level); }} className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 ${difficulty === level ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white/80 text-indigo-800 border-indigo-200'}`}>
            {level === 'easy' ? 'سهل' : level === 'normal' ? 'متوسط' : 'متقدم'}
          </button>
        ))}
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {!isFinished ? (
          <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-sm w-full">
            {cards.map((card, index) => (
              <motion.button
                key={card.id}
                onClick={() => handleCardClick(index)}
                className="relative w-full aspect-[3/4] perspective-1000"
                style={{ perspective: 1000 }}
              >
                <motion.div
                  animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="w-full h-full relative"
                >
                  {/* وجه البطاقة (الخلفي المقلوب) */}
                  <div 
                    className="absolute inset-0 bg-indigo-500 rounded-2xl border-4 border-indigo-300 shadow-md flex items-center justify-center backface-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <Sparkles className="w-8 h-8 text-indigo-300 opacity-50" />
                  </div>
                  
                  {/* وجه الصورة (الأمامي المكشوف) */}
                  <div 
                    className={`absolute inset-0 rounded-2xl border-4 shadow-md flex items-center justify-center text-4xl md:text-5xl backface-hidden ${card.isMatched ? 'bg-emerald-100 border-emerald-400' : 'bg-white border-indigo-200'}`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    {card.emoji}
                  </div>
                </motion.div>
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-indigo-300 rounded-3xl p-8 text-center max-w-sm shadow-2xl"
          >
            <div className="text-6xl mb-4 animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-indigo-900 mb-2">ذاكرة حديدية!</h2>
            <p className="text-indigo-700 font-bold mb-6">لقد ربحت مكافأتك الذهبية ويمكنك إنفاقها في المتجر.</p>
            <div className="flex gap-3">
              <button onClick={() => startNewGame()} className="flex-1 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-2xl font-black flex items-center justify-center gap-2">
                <RotateCcw className="w-5 h-5" /> إعادة
              </button>
              <button onClick={onBack} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg">
                للعودة
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
