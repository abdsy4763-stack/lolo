import React from 'react';
import { X, Star, Award, Heart, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BraveryStar } from '../types';
import { sound } from '../utils/audio';

interface BraveryBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  stars: BraveryStar[];
}

export const BraveryBookModal: React.FC<BraveryBookModalProps> = ({
  isOpen,
  onClose,
  stars,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    sound.playTap();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          className="relative w-full max-w-lg max-h-[85vh] bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200 border-4 border-amber-400 rounded-3xl shadow-2xl p-5 md:p-6 flex flex-col overflow-hidden text-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-amber-300">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center shadow">
                <Award className="w-7 h-7 text-amber-950" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-amber-950">كتاب الشجاعة</h2>
                <p className="text-xs md:text-sm text-amber-800 font-bold">نجوم بطولاتك ومحاولاتك الرائعة</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-12 h-12 rounded-full bg-white/80 hover:bg-white text-amber-950 flex items-center justify-center shadow-md border-2 border-amber-300 cursor-pointer touch-manipulation"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* عداد النجوم الكلي */}
          <div className="my-4 p-4 rounded-2xl bg-white/80 border-2 border-amber-300 flex items-center justify-around shadow-inner">
            <div className="flex items-center gap-2">
              <Star className="w-9 h-9 text-amber-500 fill-amber-400 animate-pulse" />
              <div className="text-right">
                <span className="text-3xl font-black text-amber-950">{stars.length}</span>
                <span className="text-sm font-bold text-amber-800 block">نجمة شجاعة لامعة</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs md:text-sm text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full font-bold">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>لا تُسحب أبداً!</span>
            </div>
          </div>

          {/* شريط فتح أصدقاء جدد كل 5 نجوم */}
          <div className="mb-3 px-3 py-2 rounded-2xl bg-amber-100/90 border border-amber-300 flex items-center justify-between text-xs font-black text-amber-950">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🦖</span>
              <span>
                {stars.length >= 5
                  ? '🎉 تم فتح صديقك الديناصور الصغير في قائمة الأصدقاء!'
                  : `اجمع ${5 - stars.length} نجوم إضافية لفتح الديناصور الصغير!`}
              </span>
            </div>
            <span className="bg-amber-300/80 px-2 py-0.5 rounded-full text-[11px]">
              {Math.min(5, stars.length)} / 5 ⭐
            </span>
          </div>

          {/* شبكة النجوم والملصقات */}
          <div className="flex-1 overflow-y-auto pr-1 pl-1 space-y-3 max-h-[44vh]">
            {stars.length === 0 ? (
              <div className="text-center py-10 text-amber-800">
                <Star className="w-16 h-16 mx-auto mb-3 text-amber-300" />
                <p className="text-lg font-bold">كتابك جاهز للنجوم الأولى!</p>
                <p className="text-sm text-amber-700 mt-1">العب أي مرحلة مع رفيقك لتحصل على نجمتك الأولى اللامعة!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stars.map((star, idx) => (
                  <motion.div
                    key={star.id}
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 bg-white/90 rounded-2xl border-2 border-amber-300 shadow-sm flex flex-col items-center text-center relative overflow-hidden"
                  >
                    <div className="absolute top-1 right-2 text-[10px] text-amber-600 font-bold">
                      #{stars.length - idx}
                    </div>
                    <div className="text-4xl my-1.5 filter drop-shadow">
                      {star.sticker || '⭐'}
                    </div>
                    <div className="text-xs font-black text-amber-950 line-clamp-1">
                      {star.stageTitle}
                    </div>
                    <div className="text-[10px] text-amber-700 line-clamp-1 mt-0.5">
                      {star.note}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer رسالة تشجيع */}
          <div className="mt-4 pt-3 border-t border-amber-300/60 flex items-center justify-center gap-2 text-xs md:text-sm text-amber-900 font-bold text-center">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>أنت بطل رائع ونتعلم معاً كل يوم!</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
