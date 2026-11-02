import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { X, ShoppingBag, Check, Lock, Sparkles } from 'lucide-react';
import { CompanionProfile, SHOP_ITEMS } from '../types';
import { Storage } from '../utils/storage';
import { sound } from '../utils/audio';
import { haptics } from '../utils/haptics';

interface VirtualShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (profile: CompanionProfile) => void;
}

export const VirtualShopModal: React.FC<VirtualShopModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [profile, setProfile] = useState<CompanionProfile>(Storage.getCompanionProfile());

  useEffect(() => {
    if (isOpen) {
      setProfile(Storage.getCompanionProfile());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePurchaseOrEquip = (itemId: string, price: number) => {
    sound.playTap();
    haptics.tap();

    let updatedProfile = { ...profile };
    const isOwned = profile.ownedAccessories?.includes(itemId);
    const isEquipped = profile.equippedAccessory === itemId;

    if (isEquipped) {
      // نزع الإكسسوار
      updatedProfile.equippedAccessory = null;
    } else if (isOwned) {
      // ارتداء الإكسسوار
      updatedProfile.equippedAccessory = itemId;
      sound.playSuccessChime();
    } else {
      // شراء الإكسسوار
      if ((profile.coins || 0) >= price) {
        updatedProfile.coins = (profile.coins || 0) - price;
        updatedProfile.ownedAccessories = [...(profile.ownedAccessories || []), itemId];
        updatedProfile.equippedAccessory = itemId;
        sound.playTada();
        haptics.success();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } else {
        haptics.error();
        return; // لا يوجد رصيد كافٍ
      }
    }

    const saved = Storage.saveCompanionProfile(updatedProfile);
    setProfile(saved);
    onProfileUpdated(saved);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-amber-50 to-orange-100 border-4 border-amber-400 rounded-3xl shadow-2xl p-5 flex flex-col overflow-hidden text-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-amber-300">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 border-2 border-white flex items-center justify-center shadow">
                <ShoppingBag className="w-6 h-6 text-amber-950" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-amber-950">متجر الأصدقاء</h2>
                <div className="flex items-center gap-1.5 mt-1 bg-white/80 px-2 py-0.5 rounded-full border border-amber-200">
                  <span className="text-sm font-black text-amber-800">رصيدك:</span>
                  <span className="text-base font-black text-amber-600">{profile.coins || 0}</span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="w-12 h-12 rounded-full bg-white hover:bg-amber-100 text-amber-950 flex items-center justify-center shadow-md border-2 border-amber-300 cursor-pointer touch-manipulation active:scale-95 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4 overflow-y-auto max-h-[60vh] p-1">
            {SHOP_ITEMS.map((item) => {
              const isOwned = profile.ownedAccessories?.includes(item.id);
              const isEquipped = profile.equippedAccessory === item.id;
              const canAfford = (profile.coins || 0) >= item.price;

              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePurchaseOrEquip(item.id, item.price)}
                  className={`relative p-4 rounded-3xl border-4 flex flex-col items-center justify-center gap-2 shadow-lg transition-colors ${
                    isEquipped
                      ? 'bg-emerald-100 border-emerald-400'
                      : isOwned
                      ? 'bg-white border-amber-300 hover:bg-amber-50'
                      : canAfford
                      ? 'bg-white border-amber-300 hover:bg-amber-50'
                      : 'bg-slate-100 border-slate-300 opacity-80'
                  }`}
                >
                  <div className="text-5xl filter drop-shadow-md my-2">{item.emoji}</div>
                  <span className="text-sm font-black text-amber-950">{item.name}</span>
                  
                  <div className="mt-1 w-full">
                    {isEquipped ? (
                      <div className="bg-emerald-500 text-white text-xs font-black py-1.5 rounded-xl flex items-center justify-center gap-1">
                        <Check className="w-4 h-4" /> ملبوس
                      </div>
                    ) : isOwned ? (
                      <div className="bg-amber-100 text-amber-800 text-xs font-black py-1.5 rounded-xl border border-amber-300">
                        استخدام
                      </div>
                    ) : (
                      <div className={`text-xs font-black py-1.5 rounded-xl flex items-center justify-center gap-1 border ${
                        canAfford ? 'bg-amber-400 text-amber-950 border-amber-500' : 'bg-slate-200 text-slate-500 border-slate-400'
                      }`}>
                        {!canAfford && <Lock className="w-3 h-3" />}
                        {item.price} <Sparkles className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};